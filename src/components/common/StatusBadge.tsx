import React from 'react';
import { cn } from '@/lib/utils';
import { ApplicationStatus } from '@/types/application.types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  FileQuestion,
  CheckCheck,
  Ban,
} from 'lucide-react';

export interface StatusBadgeProps {
  status: ApplicationStatus | 'ERROR';
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
  let label = status as string;
  let IconComponent: React.ComponentType<{ className?: string }> = FileQuestion;

  switch (status) {
    case 'VERIFIED':
    case 'APPROVED':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = status === 'VERIFIED' ? 'Verified / Eligible' : 'Approved';
      IconComponent = status === 'VERIFIED' ? CheckCircle2 : CheckCheck;
      break;

    case 'EXCEPTION':
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      label = 'Officer Review Exception';
      IconComponent = AlertTriangle;
      break;

    case 'INELIGIBLE':
    case 'REJECTED':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
      label = status === 'INELIGIBLE' ? 'Ineligible' : 'Rejected';
      IconComponent = status === 'INELIGIBLE' ? XCircle : Ban;
      break;

    case 'INCOMPLETE':
      badgeStyle = 'bg-yellow-50 text-yellow-800 border-yellow-300';
      label = 'Incomplete Application';
      IconComponent = Clock;
      break;

    case 'PROCESSING':
    case 'SUBMITTED':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      label = status === 'PROCESSING' ? 'Processing Pipeline' : 'Submitted';
      IconComponent = Loader2;
      break;

    case 'ERROR':
      badgeStyle = 'bg-red-100 text-red-800 border-red-300';
      label = 'Pipeline Error';
      IconComponent = XCircle;
      break;

    case 'DRAFT':
      badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
      label = 'Draft';
      IconComponent = FileQuestion;
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs transition-colors',
        badgeStyle,
        className
      )}
    >
      {showIcon && (
        <IconComponent
          className={cn(
            'w-3.5 h-3.5 shrink-0',
            status === 'PROCESSING' && 'animate-spin'
          )}
        />
      )}
      <span>{label}</span>
    </span>
  );
}
