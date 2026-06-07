import { forwardRef } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, className, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60';
    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base',
    };
    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'bg-sky-600 text-white hover:bg-sky-500',
      secondary: 'bg-slate-950 text-white hover:bg-slate-900 border border-slate-800',
      outline: 'border border-slate-700 bg-transparent text-white hover:bg-white/5',
      ghost: 'bg-transparent text-slate-100 hover:bg-white/5',
    };

    return (
      <button
        ref={ref}
        type={props.type || 'button'}
        className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], fullWidth && 'w-full', className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
