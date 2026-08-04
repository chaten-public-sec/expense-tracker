import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = ''
}) => {
  const variantStyles = {
    default: 'bg-zinc-100 text-zinc-900 border border-zinc-200',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-red-50 text-red-800 border border-red-200',
    outline: 'bg-white text-zinc-700 border border-zinc-300'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
