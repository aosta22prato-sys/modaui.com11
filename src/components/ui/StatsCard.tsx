import React from 'react';
import { Card } from './Card';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isUp: boolean;
  };
  description?: string;
  color?: 'sky' | 'emerald' | 'rose' | 'amber' | 'indigo';
  className?: string;
}

export function StatsCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  description, 
  color = 'sky',
  className 
}: StatsCardProps) {
  const colorStyles = {
    sky: 'text-sky-400 bg-sky-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    indigo: 'text-indigo-400 bg-indigo-500/10',
  };

  return (
    <Card className={clsx('flex flex-col justify-between h-32 p-5 group hover:border-slate-700 transition-all duration-300', className)}>
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">{label}</p>
        <div className={clsx('p-2 rounded-xl transition-transform group-hover:scale-110', colorStyles[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <div className="mt-1">
        <h3 className="text-2xl font-black text-white font-mono">{value}</h3>
        
        <div className="flex items-center justify-between mt-1">
          {trend ? (
            <span className={clsx('text-[10px] font-bold flex items-center gap-1', trend.isUp ? 'text-emerald-500' : 'text-rose-500')}>
              {trend.isUp ? '↑' : '↓'} {trend.value}
              <span className="text-slate-600 font-normal ml-1">vs last month</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">{description || 'Current period'}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
