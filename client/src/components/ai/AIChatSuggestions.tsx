import React from 'react';
import { Space, Typography, Tag } from 'antd';
import {
  DollarOutlined,
  TeamOutlined,
  HistoryOutlined,
  SearchOutlined,
  FireOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface AIChatSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
}

const suggestions = [
  { label: 'How much did I spend this month?', icon: <DollarOutlined /> },
  { label: 'How much do I owe Rahul?', icon: <TeamOutlined /> },
  { label: 'How much money will I receive in total?', icon: <DollarOutlined /> },
  { label: 'Show my food and grocery expenses', icon: <SearchOutlined /> },
  { label: 'What are my biggest expenses?', icon: <FireOutlined /> },
  { label: 'Who paid the most in my group?', icon: <HistoryOutlined /> },
];

export const AIChatSuggestions: React.FC<AIChatSuggestionsProps> = ({ onSelectPrompt }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        textAlign: 'center',
        gap: 14,
      }}
    >
      <div>
        <Text strong style={{ fontSize: 15, display: 'block', color: '#0f172a' }}>
          SplitWise AI Financial Assistant
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Ask in English, Hindi, or Hinglish about your expenses, balances, and dues.
        </Text>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 360 }}>
        {suggestions.map((item, idx) => (
          <Tag
            key={idx}
            icon={item.icon}
            onClick={() => onSelectPrompt(item.label)}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 20,
              cursor: 'pointer',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              transition: 'all 0.15s ease',
              margin: 0,
            }}
          >
            {item.label}
          </Tag>
        ))}
      </div>
    </div>
  );
};
