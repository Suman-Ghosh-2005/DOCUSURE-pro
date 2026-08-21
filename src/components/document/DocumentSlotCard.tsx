'use client';

import React, { useState, useRef } from 'react';
import { DocumentSlotConfig } from '@/lib/constants/document-types';
import { DocumentRecord } from '@/types/document.types';
import { cn } from '@/lib/utils';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  FileCheck,
} from 'lucide-react';

export interface DocumentSlotCardProps {
  config: DocumentSlotConfig;
  applicationId: string;
  existingDocument?: DocumentRecord;
  onUploadSuccess: (doc: DocumentRecord) => void;
}

export function DocumentSlotCard({
  config,
  applicationId,
  existingDocument,
  onUploadSuccess,
}: DocumentSlotCardProps) {
  const [uploadState, setUploadState] = useState<'EMPTY' | 'UPLOADING' | 'UPLOADED' | 'ERROR'>(
    existingDocument ? 'UPLOADED' : 'EMPTY'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = async (file: File) => {
    // Client-side MIME validation
    if (!config.acceptedFormats.includes(file.type)) {
      setUploadState('ERROR');
      setErrorMessage('Invalid format. Please upload a PDF, JPEG, or PNG.');
      return;
    }

    // Client-side Size validation
    if (file.size > config.maxSizeBytes) {
      setUploadState('ERROR');
      setErrorMessage('File size exceeds 5MB limit.');
      return;
    }

    setUploadState('UPLOADING');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('application_id', applicationId);
      formData.append('slot_type', config.slotType);
      formData.append('file', file);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Upload failed');
      }

      setUploadState('UPLOADED');
      onUploadSuccess(json.data as DocumentRecord);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document';
      setUploadState('ERROR');
      setErrorMessage(msg);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  return (
    <div
      className={cn(
        'relative bg-white border rounded-xl p-5 transition-all shadow-xs flex flex-col justify-between space-y-4',
        uploadState === 'UPLOADED' && 'border-emerald-200 bg-emerald-50/20',
        uploadState === 'ERROR' && 'border-rose-200 bg-rose-50/20',
        isDragOver && 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-400/30'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
      />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs',
              uploadState === 'UPLOADED'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {uploadState === 'UPLOADED' ? (
              <FileCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              {config.label}
              {config.isRequired && (
                <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-50 border border-rose-200 px-1 rounded">
                  Req
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-1">{config.description}</p>
          </div>
        </div>

        {/* State Badge */}
        {uploadState === 'UPLOADED' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Uploaded
          </span>
        )}

        {uploadState === 'UPLOADING' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading...
          </span>
        )}

        {uploadState === 'EMPTY' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Pending
          </span>
        )}
      </div>

      {/* Upload Zone / Document View */}
      {uploadState === 'UPLOADED' && existingDocument ? (
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="truncate">
              <span className="font-medium text-slate-900 truncate block">
                {existingDocument.original_filename || 'Uploaded Document.pdf'}
              </span>
              <span className="text-[10px] text-slate-500">
                PDF • Synthetic Machine-Readable Document
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Replace</span>
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 rounded-lg p-4 text-center cursor-pointer transition-colors space-y-1.5"
        >
          {uploadState === 'UPLOADING' ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="text-xs font-medium text-blue-700">Uploading document...</span>
            </div>
          ) : (
            <>
              <Upload className="w-5 h-5 text-slate-400 mx-auto" />
              <div className="text-xs font-medium text-slate-700">
                <span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop
              </div>
              <p className="text-[10px] text-slate-400">PDF, PNG, or JPG (Max 5MB)</p>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {uploadState === 'ERROR' && errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
