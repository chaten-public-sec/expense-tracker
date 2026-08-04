import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Content Container */}
      <div className={`relative w-full ${widthClasses[maxWidth]} bg-white rounded-2xl shadow-xl border border-zinc-200 p-5 sm:p-6 z-10 animate-fade-in my-auto max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
          <div>
            {title && <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{title}</h3>}
            {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 pr-0.5">
          {children}
        </div>
      </div>
    </div>
  );
};
