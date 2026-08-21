import { ExceptionSeverity } from '@/types/exception.types';
import { cn } from '@/lib/utils';
import { Info, AlertCircle, AlertTriangle, Flame } from 'lucide-react';

export interface SeverityBadgeProps {
  severity: ExceptionSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let IconComponent = Info;

  switch (severity) {
    case 'INFO':
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      IconComponent = Info;
      break;

    case 'WARNING':
      badgeStyle = 'bg-yellow-50 text-yellow-800 border-yellow-300';
      IconComponent = AlertCircle;
      break;

    case 'MAJOR':
      badgeStyle = 'bg-orange-50 text-orange-800 border-orange-300 font-medium';
      IconComponent = AlertTriangle;
      break;

    case 'CRITICAL':
      badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      IconComponent = Flame;
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border uppercase tracking-wider',
        badgeStyle,
        className
      )}
    >
      <IconComponent className="w-3 h-3 shrink-0" />
      <span>{severity}</span>
    </span>
  );
}
