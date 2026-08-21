import { SCHOLARSHIP_DOCUMENT_SLOTS } from '@/lib/constants/document-types';
import { DocumentRecord } from '@/types/document.types';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export interface DocumentChecklistProps {
  documents: DocumentRecord[];
}

export function DocumentChecklist({ documents }: DocumentChecklistProps) {
  const uploadedSlotTypes = new Set(documents.map((d) => d.slot_type));

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Required Document Checklist
      </h4>

      <ul className="space-y-2">
        {SCHOLARSHIP_DOCUMENT_SLOTS.map((slot) => {
          const isUploaded = uploadedSlotTypes.has(slot.slotType);
          return (
            <li
              key={slot.slotType}
              className="flex items-center justify-between text-xs p-2.5 rounded-lg border bg-slate-50 border-slate-200"
            >
              <div className="flex items-center gap-2">
                {isUploaded ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className={isUploaded ? 'font-semibold text-slate-900' : 'text-slate-600'}>
                  {slot.label}
                </span>
              </div>

              {isUploaded ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  READY
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                  MISSING
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
