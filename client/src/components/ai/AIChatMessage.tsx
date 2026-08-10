import React from 'react';
import { Avatar, Typography, Space } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import { ChatMessage } from '../../hooks/useAIChat';
import { AIChatToolStatus } from './AIChatToolStatus';

const { Text } = Typography;

interface AIChatMessageProps {
  message: ChatMessage;
}

// Simple, safe Markdown formatter without dangerouslySetInnerHTML
const FormattedText: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} style={{ height: 6 }} />;
        }

        // Bullet point line
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.replace(/^[\•\-\*]\s*/, '');
          return (
            <div key={lIdx} style={{ display: 'flex', gap: 6, paddingLeft: 4 }}>
              <span style={{ color: '#2563eb', fontWeight: 700 }}>•</span>
              <span>{parseBold(text)}</span>
            </div>
          );
        }

        // Heading lines
        if (trimmed.startsWith('### ')) {
          return (
            <div key={lIdx} style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', marginTop: 4 }}>
              {parseBold(trimmed.replace(/^###\s*/, ''))}
            </div>
          );
        }

        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <div key={lIdx} style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginTop: 6 }}>
              {parseBold(trimmed.replace(/^#+\s*/, ''))}
            </div>
          );
        }

        return <div key={lIdx}>{parseBold(line)}</div>;
      })}
    </div>
  );
};

// Parses **bold** strings safely into React <strong> elements
const parseBold = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} style={{ color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export const AIChatMessage: React.FC<AIChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 8,
        margin: '6px 0',
      }}
    >
      <Avatar
        size={30}
        style={{
          backgroundColor: isUser ? '#0f172a' : '#2563eb',
          fontSize: 12,
          flexShrink: 0,
        }}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
      />

      <div
        style={{
          maxWidth: '82%',
          padding: '10px 14px',
          borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
          backgroundColor: isUser ? '#2563eb' : '#f8fafc',
          color: isUser ? '#ffffff' : '#1e293b',
          border: isUser ? 'none' : '1px solid #e2e8f0',
          fontSize: 13,
          lineHeight: 1.5,
          wordBreak: 'break-word',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        }}
      >
        {message.toolStatus && <AIChatToolStatus status={message.toolStatus} />}
        {message.text ? (
          isUser ? (
            <div>{message.text}</div>
          ) : (
            <FormattedText content={message.text} />
          )
        ) : (
          !message.toolStatus && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Thinking...
            </Text>
          )
        )}
      </div>
    </div>
  );
};
