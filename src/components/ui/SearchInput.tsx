import React from 'react';
import { Search } from 'lucide-react';
import { Input, InputProps } from './Input';
import clsx from 'clsx';

export interface SearchInputProps extends InputProps {
  onSearch?: (value: string) => void;
}

export function SearchInput({ className, onSearch, ...props }: SearchInputProps) {
  return (
    <div className={clsx('relative group', className)}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-sky-400" />
      <Input
        {...props}
        className="pl-11 bg-slate-900/50 border-slate-800 hover:border-slate-700 focus:border-sky-500/50 transition-all rounded-2xl"
        onChange={(e) => {
          props.onChange?.(e);
          onSearch?.(e.target.value);
        }}
      />
    </div>
  );
}
