import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-soft transition-all duration-200 ${
        hoverable ? 'hover:border-zinc-300 hover:shadow-card cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
