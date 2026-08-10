import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../hooks/useAIChat';
import { AIChatMessage } from './AIChatMessage';
import { AIChatSuggestions } from './AIChatSuggestions';

interface AIChatMessagesProps {
  messages: ChatMessage[];
  onSelectPrompt: (prompt: string) => void;
}

export const AIChatMessages: React.FC<AIChatMessagesProps> = ({
  messages,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AIChatSuggestions onSelectPrompt={onSelectPrompt} />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {messages.map((msg) => (
        <AIChatMessage key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} style={{ height: 4 }} />
    </div>
  );
};
