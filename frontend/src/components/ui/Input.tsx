'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-wide uppercase select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center" aria-hidden="true">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error && inputId ? `${inputId}-error` : undefined}
            className={cn(
              'w-full rounded-lg bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm transition-colors duration-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
              icon && 'pl-10',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={inputId ? `${inputId}-error` : undefined} role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
