import React from 'react';
import clsx from 'clsx';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export function Table({ headers, children, className }: TableProps) {
  return (
    <div className={clsx('w-full overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/50', className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-800 bg-slate-900/50 text-slate-400">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-6 py-4 font-semibold uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-slate-200">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function TableRow({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr 
      className={clsx(
        'transition-colors duration-200',
        onClick ? 'cursor-pointer hover:bg-white/5' : '',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx('px-6 py-4', className)}>{children}</td>;
}
