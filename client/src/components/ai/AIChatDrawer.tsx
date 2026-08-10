import React, { useState, useEffect } from 'react';
import { Drawer } from 'antd';
import { useAIChat } from '../../hooks/useAIChat';
import { AIChatHeader } from './AIChatHeader';
import { AIChatMessages } from './AIChatMessages';
import { AIChatInput } from './AIChatInput';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose }) => {
  const {
    messages,
    isThinking,
    isStreaming,
    sendMessage,
    stopGeneration,
    startNewChat,
  } = useAIChat();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  // 1. Mobile Drawer View
  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onClose={onClose}
        placement="bottom"
        height="90dvh"
        styles={{
          header: { display: 'none' },
          body: {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          },
        }}
      >
        <AIChatHeader
          onClose={onClose}
          onNewChat={startNewChat}
          hasMessages={messages.length > 0}
        />
        <AIChatMessages
          messages={messages}
          onSelectPrompt={(p) => sendMessage(p)}
        />
        <AIChatInput
          onSend={(t) => sendMessage(t)}
          onStop={stopGeneration}
          isGenerating={isThinking || isStreaming}
        />
      </Drawer>
    );
  }

  // 2. Desktop Floating Window View
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 400,
        height: 580,
        maxHeight: 'calc(100vh - 40px)',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.18)',
        border: '1px solid #e2e8f0',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <AIChatHeader
        onClose={onClose}
        onNewChat={startNewChat}
        hasMessages={messages.length > 0}
      />
      <AIChatMessages
        messages={messages}
        onSelectPrompt={(p) => sendMessage(p)}
      />
      <AIChatInput
        onSend={(t) => sendMessage(t)}
        onStop={stopGeneration}
        isGenerating={isThinking || isStreaming}
      />
    </div>
  );
};
