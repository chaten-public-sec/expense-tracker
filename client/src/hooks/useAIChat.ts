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

  // Initialize or resume AI Chat session with Socket.IO
  useEffect(() => {
    if (!socket || !user) return;

    const initSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
    socket.emit('ai:chat:start', { sessionId: initSessionId });

    const handleReady = (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
      sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
    };

    const handleThinking = () => {
      setIsThinking(true);
      setIsStreaming(false);
      setCurrentToolStatus(null);
      setError(null);

      // Create placeholder assistant message
      const msgId = `ai_msg_${Date.now()}`;
      activeMessageIdRef.current = msgId;

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'assistant',
          text: '',
          timestamp: new Date(),
        },
      ]);
    };

    const handleToolStart = (data: { toolName: string; friendlyLabel: string }) => {
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

    const handleToolComplete = () => {
      setCurrentToolStatus(null);
      if (activeMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMessageIdRef.current ? { ...msg, toolStatus: null } : msg
          )
        );
      }
    };

    const handleToken = (data: { token: string }) => {
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

    const handleComplete = (data: { fullText: string }) => {
      setIsThinking(false);
      setIsStreaming(false);
      setCurrentToolStatus(null);

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
    };

    const handleStopped = () => {
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
      activeMessageIdRef.current = null;
    };

    const handleError = (data: { message: string }) => {
      setIsThinking(false);
      setIsStreaming(false);
      setCurrentToolStatus(null);
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
    };

    socket.on('ai:chat:ready', handleReady);
    socket.on('ai:chat:thinking', handleThinking);
    socket.on('ai:chat:tool:start', handleToolStart);
    socket.on('ai:chat:tool:complete', handleToolComplete);
    socket.on('ai:chat:token', handleToken);
    socket.on('ai:chat:message:complete', handleComplete);
    socket.on('ai:chat:stopped', handleStopped);
    socket.on('ai:chat:error', handleError);

    return () => {
      socket.off('ai:chat:ready', handleReady);
      socket.off('ai:chat:thinking', handleThinking);
      socket.off('ai:chat:tool:start', handleToolStart);
      socket.off('ai:chat:tool:complete', handleToolComplete);
      socket.off('ai:chat:token', handleToken);
      socket.off('ai:chat:message:complete', handleComplete);
      socket.off('ai:chat:stopped', handleStopped);
      socket.off('ai:chat:error', handleError);
    };
  }, [socket, user]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !socket || isThinking || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `user_msg_${Date.now()}`,
        role: 'user',
        text: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setError(null);

      socket.emit('ai:chat:message', {
        sessionId,
        text: text.trim(),
      });
    },
    [socket, sessionId, isThinking, isStreaming]
  );

  const stopGeneration = useCallback(() => {
    if (!socket || !sessionId) return;
    socket.emit('ai:chat:stop', { sessionId });
    setIsThinking(false);
    setIsStreaming(false);
    setCurrentToolStatus(null);
  }, [socket, sessionId]);

  const startNewChat = useCallback(() => {
    if (socket && sessionId) {
      socket.emit('ai:chat:reset', { sessionId });
    }
    setMessages([]);
    setError(null);
    setIsThinking(false);
    setIsStreaming(false);
    setCurrentToolStatus(null);
    activeMessageIdRef.current = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, [socket, sessionId]);

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
