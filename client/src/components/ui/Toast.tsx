import React, { createContext, useContext } from 'react';
import { message, notification, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface ToastContextType {
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  showError: (errorMsg: string, title?: string) => void;
  showSuccess: (successMsg: string, title?: string) => void;
  confirmAction: (options: {
    title: string;
    content: string;
    onOk: () => Promise<void> | void;
    okText?: string;
    cancelText?: string;
    danger?: boolean;
  }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messageApi, messageHolder] = message.useMessage();
  const [notificationApi, notifHolder] = notification.useNotification();
  const [modal, modalHolder] = Modal.useModal();

  const showToast = (
    msg: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success',
    title?: string
  ) => {
    if (title) {
      notificationApi[type === 'warning' ? 'warning' : type]({
        message: title,
        description: msg,
        placement: 'top',
        duration: 3.5,
        style: {
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
      });
    } else {
      messageApi.open({
        type: type === 'warning' ? 'warning' : type,
        content: msg,
        duration: 3,
        style: {
          marginTop: '10vh',
        },
      });
    }
  };

  const showError = (errorMsg: string, title: string = 'Error Occurred') => {
    showToast(errorMsg, 'error', title);
  };

  const showSuccess = (successMsg: string, title: string = 'Success') => {
    showToast(successMsg, 'success', title);
  };

  const confirmAction = ({
    title,
    content,
    onOk,
    okText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
  }: {
    title: string;
    content: string;
    onOk: () => Promise<void> | void;
    okText?: string;
    cancelText?: string;
    danger?: boolean;
  }) => {
    modal.confirm({
      title,
      icon: <ExclamationCircleOutlined style={{ color: danger ? '#ff4d4f' : '#1677ff' }} />,
      content,
      okText,
      cancelText,
      okButtonProps: { danger, size: 'large', style: { borderRadius: 8 } },
      cancelButtonProps: { size: 'large', style: { borderRadius: 8 } },
      centered: true,
      onOk,
    });
  };

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, confirmAction }}>
      {messageHolder}
      {notifHolder}
      {modalHolder}
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
