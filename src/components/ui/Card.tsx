import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'elevated';
}

export function Card({ variant = 'surface', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-[2rem] border p-6 shadow-xl transition-colors duration-200',
        variant === 'elevated'
          ? 'bg-white text-slate-900 border-slate-200 shadow-black/10'
          : 'bg-slate-950 text-white border-slate-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
