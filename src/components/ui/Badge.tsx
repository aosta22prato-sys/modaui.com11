import clsx from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-slate-900 text-slate-200 border border-slate-800',
    success: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    info: 'bg-sky-500/10 text-sky-300 border border-sky-500/20',
  };

  return (
    <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', variantStyles[variant], className)} {...props}>
      {children}
    </span>
  );
}
