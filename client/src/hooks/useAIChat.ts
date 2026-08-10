import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolStatus?: string | null;
  timestamp: Date;
}

const SESSION_STORAGE_KEY = 'splitwise_ai_session_id';

export const useAIChat = () => {
  const { socket } = useSocket();
  const { user, group } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolStatus, setCurrentToolStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
  });

  const activeMessageIdRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);

  // Helper to clear terminal states
  const clearTerminalState = useCallback(() => {
    setIsThinking(false);
    setIsStreaming(false);
    setCurrentToolStatus(null);
    if (activeMessageIdRef.current) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === activeMessageIdRef.current ? { ...msg, toolStatus: null } : msg
        )
      );
    }
  }, []);

  // Initialize or resume AI Chat session with Socket.IO
  useEffect(() => {
    if (!socket || !user) return;

    const initSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
    socket.emit('ai:chat:start', { sessionId: initSessionId });

    const handleReady = (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
      sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
    };

    const handleThinking = (data: { requestId?: string }) => {
      if (data?.requestId && activeRequestIdRef.current && data.requestId !== activeRequestIdRef.current) {
        return; // Ignore stale request event
      }
      setIsThinking(true);
      setIsStreaming(false);
      setCurrentToolStatus(null);
      setError(null);
    };

    const handleToolStart = (data: { requestId?: string; toolName: string; friendlyLabel: string }) => {
      if (data?.requestId && activeRequestIdRef.current && data.requestId !== activeRequestIdRef.current) {
        return;
      }
      setCurrentToolStatus(data.friendlyLabel);
      if (activeMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMessageIdRef.current
              ? { ...msg, toolStatus: data.friendlyLabel }
              : msg
          )
        );
      }
    };

    const handleToolComplete = (data: { requestId?: string }) => {
      if (data?.requestId && activeRequestIdRef.current && data.requestId !== activeRequestIdRef.current) {
        return;
      }
      setCurrentToolStatus(null);
      if (activeMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMessageIdRef.current ? { ...msg, toolStatus: null } : msg
          )
        );
      }
    };

    const handleToken = (data: { requestId?: string; token: string }) => {
      if (data?.requestId && activeRequestIdRef.current && data.requestId !== activeRequestIdRef.current) {
        return;
      }
      setIsThinking(false);
      setIsStreaming(true);
      setCurrentToolStatus(null);

      if (activeMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMessageIdRef.current
              ? { ...msg, text: msg.text + data.token, toolStatus: null }
              : msg
          )
        );
      }
    };

    const handleComplete = (data: { requestId?: string; fullText: string }) => {
      if (data?.requestId && activeRequestIdRef.current && data.requestId !== activeRequestIdRef.current) {
        return;
      }
      clearTerminalState();

      if (activeMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMessageIdRef.current
              ? { ...msg, text: data.fullText || msg.text, toolStatus: null }
              : msg
          )
        );
      }
      activeMessageIdRef.current = null;
      activeRequestIdRef.current = null;
    };

    const handleStopped = (data?: { requestId?: string }) => {
      if (data?.requestId && activeRequestIdRef.current && data.requestId !== activeRequestIdRef.current) {
        return;
      }
      clearTerminalState();
      activeMessageIdRef.current = null;
      activeRequestIdRef.current = null;
    };

    const handleError = (data: { requestId?: string; message: string }) => {
      if (data?.requestId && activeRequestIdRef.current && data.requestId !== activeRequestIdRef.current) {
        return;
      }
      clearTerminalState();
      setError(data.message || 'An error occurred.');

      if (activeMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMessageIdRef.current
              ? {
                  ...msg,
                  text: msg.text || data.message || 'Sorry, I encountered an error answering your question.',
                  toolStatus: null,
                }
              : msg
          )
        );
      }
      activeMessageIdRef.current = null;
      activeRequestIdRef.current = null;
    };

    const handleTimeout = (data: { requestId?: string; message: string }) => {
      if (data?.requestId && activeRequestIdRef.current && data.requestId !== activeRequestIdRef.current) {
        return;
      }
      clearTerminalState();
      const timeoutMsg = data.message || 'AI request timed out. Please try again.';
      setError(timeoutMsg);

      if (activeMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMessageIdRef.current
              ? {
                  ...msg,
                  text: msg.text || timeoutMsg,
                  toolStatus: null,
                }
              : msg
          )
        );
      }
      activeMessageIdRef.current = null;
      activeRequestIdRef.current = null;
    };

    socket.on('ai:chat:ready', handleReady);
    socket.on('ai:chat:thinking', handleThinking);
    socket.on('ai:chat:tool:start', handleToolStart);
    socket.on('ai:chat:tool:complete', handleToolComplete);
    socket.on('ai:chat:token', handleToken);
    socket.on('ai:chat:message:complete', handleComplete);
    socket.on('ai:chat:stopped', handleStopped);
    socket.on('ai:chat:error', handleError);
    socket.on('ai:chat:timeout', handleTimeout);

    return () => {
      socket.off('ai:chat:ready', handleReady);
      socket.off('ai:chat:thinking', handleThinking);
      socket.off('ai:chat:tool:start', handleToolStart);
      socket.off('ai:chat:tool:complete', handleToolComplete);
      socket.off('ai:chat:token', handleToken);
      socket.off('ai:chat:message:complete', handleComplete);
      socket.off('ai:chat:stopped', handleStopped);
      socket.off('ai:chat:error', handleError);
      socket.off('ai:chat:timeout', handleTimeout);
    };
  }, [socket, user, clearTerminalState]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !socket || isThinking || isStreaming) return;

      const reqId = `ai_req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const assistantMsgId = `ai_msg_${Date.now()}`;

      activeRequestIdRef.current = reqId;
      activeMessageIdRef.current = assistantMsgId;

      const userMsg: ChatMessage = {
        id: `user_msg_${Date.now()}`,
        role: 'user',
        text: text.trim(),
        timestamp: new Date(),
      };

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setError(null);
      setIsThinking(true);

      socket.emit('ai:chat:message', {
        sessionId,
        requestId: reqId,
        text: text.trim(),
      });
    },
    [socket, sessionId, isThinking, isStreaming]
  );

  const stopGeneration = useCallback(() => {
    if (!socket || !sessionId) return;
    socket.emit('ai:chat:stop', { sessionId, requestId: activeRequestIdRef.current });
    clearTerminalState();
    activeMessageIdRef.current = null;
    activeRequestIdRef.current = null;
  }, [socket, sessionId, clearTerminalState]);

  const startNewChat = useCallback(() => {
    if (socket && sessionId) {
      socket.emit('ai:chat:reset', { sessionId });
    }
    setMessages([]);
    setError(null);
    clearTerminalState();
    activeMessageIdRef.current = null;
    activeRequestIdRef.current = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, [socket, sessionId, clearTerminalState]);

  return {
    messages,
    isThinking,
    isStreaming,
    currentToolStatus,
    error,
    sendMessage,
    stopGeneration,
    startNewChat,
  };
};
