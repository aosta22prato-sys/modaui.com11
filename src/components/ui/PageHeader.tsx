import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-sky-400',
  actions, 
  className 
}: PageHeaderProps) {
  return (
    <div className={clsx('flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8', className)}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={clsx('w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg', iconColor)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
