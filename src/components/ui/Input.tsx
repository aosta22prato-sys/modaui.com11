import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'ghost';
  fullWidth?: boolean;
}

export function Input({ variant = 'default', fullWidth = false, className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        'w-full rounded-2xl border px-4 py-3 text-sm text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'ghost' ? 'border-transparent bg-white/10 placeholder:text-zinc-500' : 'border-zinc-800 bg-zinc-950',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    />
  );
}
