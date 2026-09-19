import { useCallback, useRef } from 'react';
import { Upload, X, FileText, FileSpreadsheet } from 'lucide-react';
import type { FileInfo, AppState } from '../../types/credit';
import { formatFileSize } from '../../lib/credit/numberParser';
import { cn } from '../../lib/utils';

type CreditUploaderProps = {
  fileInfo: FileInfo | null;
  state: AppState;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  onDemoLoad: () => void;
};

const ACCEPTED_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  '.csv',
  '.xls',
  '.xlsx',
  '.pdf',
];

export function CreditUploader({
  fileInfo,
  state,
  onFileSelect,
  onFileRemove,
  onDemoLoad,
}: CreditUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  };

  const isProcessing = state === 'parsing' || state === 'calculating';

  return (
    <div className="w-full">
      {!fileInfo ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed',
            'border-slate-300 bg-slate-50/50 p-8 sm:p-12',
            'cursor-pointer transition-all duration-200',
            'hover:border-blue-400 hover:bg-blue-50/50',
            'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Încarcă scadențarul creditului"
          />

          <div className="mb-4 rounded-full bg-blue-100 p-3">
            <Upload className="h-6 w-6 text-blue-600" />
          </div>

          <p className="mb-1 text-lg font-semibold text-slate-900">Încarcă scadențarul</p>
          <p className="mb-4 text-sm text-slate-500">
            Trage documentul aici sau selectează un fișier
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="rounded-md bg-slate-100 px-2 py-1">PDF</span>
            <span className="rounded-md bg-slate-100 px-2 py-1">CSV</span>
            <span className="rounded-md bg-slate-100 px-2 py-1">XLSX</span>
            <span className="rounded-md bg-slate-100 px-2 py-1">XLS</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="mt-6 cursor-pointer rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white
              transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            Selectează fișier
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(fileInfo.type)}
              <div>
                <p className="font-medium text-slate-900">{fileInfo.name}</p>
                <p className="text-sm text-slate-500">
                  {formatFileSize(fileInfo.size)} · {fileInfo.type.split('/').pop()?.toUpperCase()}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onFileRemove}
              disabled={isProcessing}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600
                disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Elimină fișierul"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isProcessing && (
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Se procesează fișierul...
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onDemoLoad}
          className="cursor-pointer text-sm text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-600"
        >
          Vezi exemplu cu date demo
        </button>
      </div>
    </div>
  );
}
