import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { ValidationResult } from '../../types/credit';

type ValidationMessageProps = {
  result: ValidationResult;
};

export function ValidationMessage({ result }: ValidationMessageProps) {
  if (result.isValid && result.difference === 0) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${
        result.isValid
          ? 'border-green-200 bg-green-50'
          : 'border-amber-200 bg-amber-50'
      }`}
    >
      {result.isValid ? (
        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
      )}
      <p
        className={`text-sm ${
          result.isValid ? 'text-green-800' : 'text-amber-800'
        }`}
      >
        {result.message}
      </p>
    </div>
  );
}
