import type { ColumnMapping } from '../../types/credit';
import { getFieldLabel } from '../../lib/credit/columnDetection';
import { AlertCircle } from 'lucide-react';

type ColumnMapperProps = {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onConfirm: () => void;
};

export function ColumnMapper({ headers, mapping, onMappingChange, onConfirm }: ColumnMapperProps) {
  const validHeaders = headers.filter(h => h && h.trim().length > 0);
  const requiredFields: (keyof ColumnMapping)[] = ['principal', 'interest'];
  const optionalFields: (keyof ColumnMapping)[] = [
    'installmentNumber',
    'date',
    'payment',
    'fees',
    'remainingBalance',
  ];

  const unmappedRequired = requiredFields.filter(f => !mapping[f]);

  const handleChange = (field: keyof ColumnMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [field]: value || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">
          Selectează coloanele manual
        </h3>
        <p className="mb-6 text-sm text-slate-500">
          Mapează coloanele din fișierul tău la câmpurile necesare pentru calcul.
        </p>

        {unmappedRequired.length > 0 && (
          <div className="mb-6 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <p className="text-sm text-amber-800">
              Trebuie să selectezi cel puțin coloana pentru{' '}
              {unmappedRequired.map(f => getFieldLabel(f)).join(' și ')}.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Required fields */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Câmpuri obligatorii</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {requiredFields.map(field => (
                <div key={field}>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    {getFieldLabel(field)} *
                  </label>
                  <select
                    value={mapping[field] ?? ''}
                    onChange={e => handleChange(field, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm
                      text-slate-900 transition-colors
                      focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Selectează coloana --</option>
                    {validHeaders.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Câmpuri opționale</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {optionalFields.map(field => (
                <div key={field}>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    {getFieldLabel(field)}
                  </label>
                  <select
                    value={mapping[field] ?? ''}
                    onChange={e => handleChange(field, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm
                      text-slate-900 transition-colors
                      focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Nu este necesar --</option>
                    {validHeaders.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={unmappedRequired.length > 0}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white
          transition-colors hover:bg-blue-700 active:bg-blue-800
          disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirmă și calculează
      </button>
    </div>
  );
}
