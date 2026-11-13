import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glow';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold tracking-wide select-none transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#1E88FF]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050A14] disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap active:scale-[0.98] will-change-transform';

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-[#1E88FF] hover:bg-[#1570d6] text-white border border-white/10',
      glow:
        'bg-[#1E88FF] hover:bg-[#1570d6] text-white border border-white/15',
      secondary:
        'bg-[#101A30] hover:bg-[#16223D] text-[#CBD5E1] hover:text-white border border-white/10 hover:border-white/20 shadow-sm',
      ghost:
        'bg-transparent hover:bg-white/5 text-[#94A3B8] hover:text-white border border-transparent',
      danger:
        'bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 shadow-sm',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'text-xs px-3 py-1.5 min-h-[36px] rounded-xl gap-1.5',
      md: 'text-xs sm:text-sm px-4 py-2.5 min-h-[44px] rounded-xl gap-2', // 44px minimum touch target
      lg: 'text-sm sm:text-base px-6 py-3 min-h-[48px] rounded-2xl gap-2.5',
      icon: 'p-2.5 min-w-[44px] min-h-[44px] rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children && <span>{children}</span>}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
