const { GoogleGenAI } = require('@google/genai');

let aiClient = null;

/**
 * Initializes and returns the official Google Gen AI SDK client.
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.warn('[Gemini AI] GEMINI_API_KEY is not configured in server environment.');
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
    console.log('🤖 [Gemini AI] Google Gen AI Client initialized successfully.');
  }

  return aiClient;
};

const getModelName = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const getEmbeddingModelName = () => process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

/**
 * Internal backend diagnostic to verify Gemini API connection.
 */
const testGemini = async () => {
  const client = getGeminiClient();
  if (!client) {
    return { success: false, error: 'Gemini client not initialized. Missing GEMINI_API_KEY.' };
  }

  try {
    const res = await client.models.generateContent({
      model: getModelName(),
      contents: 'Respond with "Gemini is connected and working."',
    });

    return {
      success: true,
      model: getModelName(),
      response: res.text || 'OK',
    };
  } catch (err) {
    console.error('[Gemini Test Error]:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  getGeminiClient,
  getModelName,
  getEmbeddingModelName,
  testGemini,
};
