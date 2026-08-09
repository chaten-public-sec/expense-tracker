import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
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
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    const el = e.target;
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Modal Container: Bottom Sheet on Mobile (<768px), Centered Dialog on Desktop (>=768px) */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            initial={{ opacity: 0, y: '100%', scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: '100%', scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onFocus={handleFocus}
            className={`relative z-10 w-full bg-white border border-zinc-200 shadow-2xl rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden ${MAX_WIDTH_CLASSES[maxWidth] || 'max-w-md'}`}
          >
            {/* Mobile Drag Pill Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-300" />
            </div>

            {/* Header */}
            {(title || description) && (
              <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-zinc-100 flex items-start justify-between gap-3 bg-white">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 id="modal-title" className="text-lg font-bold text-zinc-900 tracking-tight leading-snug">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="flex-shrink-0 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 overscroll-contain">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex-shrink-0 p-4 border-t border-zinc-100 bg-white">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

