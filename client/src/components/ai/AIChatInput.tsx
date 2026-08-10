import React, { useState } from 'react';
import { Input, Button, Space } from 'antd';
import { SendOutlined, StopOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface AIChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isGenerating: boolean;
}

export const AIChatInput: React.FC<AIChatInputProps> = ({
  onSend,
  onStop,
  isGenerating,
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleSend = () => {
    if (!inputVal.trim() || isGenerating) return;
    onSend(inputVal);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        padding: '10px 14px calc(env(safe-area-inset-bottom, 0px) + 10px)',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <TextArea
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask in English, Hindi, or Hinglish..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={isGenerating}
          style={{
            borderRadius: 12,
            resize: 'none',
            fontSize: 13,
            padding: '8px 12px',
          }}
        />

        {isGenerating ? (
          <Button
            danger
            icon={<StopOutlined />}
            onClick={onStop}
            style={{ borderRadius: 10, height: 38, flexShrink: 0 }}
          >
            Stop
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!inputVal.trim()}
            style={{
              borderRadius: 10,
              height: 38,
              backgroundColor: '#2563eb',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
};
