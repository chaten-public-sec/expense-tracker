const { getGeminiClient, getModelName } = require('./geminiClient');
const { aiToolDeclarations, executeTool, getFriendlyToolLabel } = require('./aiTools');
const { buildSystemPrompt } = require('./aiPrompt');
const {
  getOrCreateSession,
  addMessageToSession,
  setSessionAbortController,
} = require('./chatSessionStore');
const GroupMember = require('../models/GroupMember');

/**
 * Handles incoming chat query with tool execution loop and token streaming.
 */
const processAIStreamQuery = async ({
  sessionId,
  user,
  userPrompt,
  onToolStart,
  onToolComplete,
  onToken,
  onComplete,
  onError,
}) => {
  try {
    const aiClient = getGeminiClient();
    if (!aiClient) {
      onError('Gemini AI is not configured on this server. Please check GEMINI_API_KEY.');
      return;
    }

    // 1. Get active group
    const membership = await GroupMember.findOne({ userId: user._id }).populate('groupId', 'name');
    const groupId = membership?.groupId?._id?.toString() || null;
    const groupName = membership?.groupId?.name || 'Flatmates';

    const session = getOrCreateSession(sessionId, user._id, groupId, user.fullName);
    if (!session) {
      onError('Invalid or unauthorized session.');
      return;
    }

    // Setup abort controller for stream cancellation & 15s execution timeout
    const abortController = new AbortController();
    setSessionAbortController(session.sessionId, abortController);

    const timeoutId = setTimeout(() => {
      if (!abortController.signal.aborted) {
        console.warn(`[AI Orchestrator] Request timed out after 15s for session ${session.sessionId}`);
        abortController.abort();
        if (onError) onError('AI response timed out. Please try again.');
      }
    }, 15000);

    const modelName = getModelName();
    const systemInstruction = buildSystemPrompt(user.fullName, groupName);

    const context = {
      userId: user._id.toString(),
      groupId,
      userName: user.fullName,
    };

    // 2. Prepare contents payload including in-memory history
    const contents = [
      ...session.messages,
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ];

    const toolsConfig = [{ functionDeclarations: aiToolDeclarations }];

    let isToolLoopActive = true;
    let toolExecutionTurns = 0;
    const maxToolTurns = 4;

    while (isToolLoopActive && toolExecutionTurns < maxToolTurns) {
      if (abortController.signal.aborted) {
        return;
      }

      // Check if Gemini wants to call a tool
      const checkRes = await aiClient.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          tools: toolsConfig,
        },
      });

      if (abortController.signal.aborted) return;

      const functionCalls = checkRes.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        toolExecutionTurns++;
        const call = functionCalls[0];
        const toolName = call.name;
        const callArgs = call.args || {};

        // Notify client of tool execution
        const friendlyLabel = getFriendlyToolLabel(toolName);
        if (onToolStart) onToolStart(toolName, friendlyLabel);

        // Execute deterministic tool
        const toolResult = await executeTool(toolName, callArgs, context);

        if (onToolComplete) onToolComplete(toolName, toolResult);

        // Feed tool response back into contents
        contents.push({
          role: 'model',
          parts: [{ functionCall: call }],
        });

        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: { result: toolResult },
              },
            },
          ],
        });
      } else {
        isToolLoopActive = false;
      }
    }

    if (abortController.signal.aborted) return;

    // 3. Stream final conversational answer
    const stream = await aiClient.models.generateContentStream({
      model: modelName,
      contents,
      config: {
        systemInstruction,
      },
    });

    let fullGeneratedText = '';

    for await (const chunk of stream) {
      if (abortController.signal.aborted) {
        break;
      }

      const text = chunk.text;
      if (text) {
        fullGeneratedText += text;
        if (onToken) onToken(text);
      }
    }

    if (!abortController.signal.aborted && fullGeneratedText) {
      // Store into ephemeral in-memory session only
      addMessageToSession(session.sessionId, 'user', userPrompt);
      addMessageToSession(session.sessionId, 'model', fullGeneratedText);

      if (onComplete) {
        onComplete({
          sessionId: session.sessionId,
          fullText: fullGeneratedText,
        });
      }
    }
  } catch (err) {
    console.error('[AI Orchestrator Error]:', err);
    if (onError) {
      onError(err.message || 'Error processing AI query.');
    }
  } finally {
    if (typeof timeoutId !== 'undefined') clearTimeout(timeoutId);
  }
};

module.exports = {
  processAIStreamQuery,
};
