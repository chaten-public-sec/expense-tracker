import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
            {label}
          </label>
        )}
        <div className="relative rounded-xl shadow-sm">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white text-zinc-900 placeholder:text-zinc-400 text-sm rounded-xl border border-zinc-200 py-2.5 ${
              icon ? 'pl-10' : 'pl-3.5'
            } pr-3.5 transition-colors focus:outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-zinc-50 disabled:text-zinc-500 ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-zinc-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
