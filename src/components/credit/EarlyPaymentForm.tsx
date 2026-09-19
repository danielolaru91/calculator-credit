import { useState } from 'react';
import { Plus, X, Calendar, Banknote } from 'lucide-react';
import type { CreditInstallment } from '../../types/credit';

export type EarlyPayment = {
  id: string;
  fromDate: string;
  toDate: string;
  amount: number;
};

type EarlyPaymentFormProps = {
  installments: CreditInstallment[];
  payments: EarlyPayment[];
  onAdd: (payment: EarlyPayment) => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
  onSkip: () => void;
};

function getAvailableDates(installments: CreditInstallment[]): string[] {
  const dates = installments
    .map(i => i.date)
    .filter((d): d is string => !!d && d.length > 0);
  return [...new Set(dates)];
}

export function EarlyPaymentForm({
  installments,
  payments,
  onAdd,
  onRemove,
  onContinue,
  onSkip,
}: EarlyPaymentFormProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const availableDates = getAvailableDates(installments);

  const handleAdd = () => {
    setError('');

    if (!fromDate || !toDate) {
      setError('Selectează perioada.');
      return;
    }

    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Introdu o sumă validă.');
      return;
    }

    // Validate date order
    const fromIdx = availableDates.indexOf(fromDate);
    const toIdx = availableDates.indexOf(toDate);
    if (fromIdx > toIdx) {
      setError('Data de început trebuie să fie înainte de data de sfârșit.');
      return;
    }

    onAdd({
      id: Date.now().toString(),
      fromDate,
      toDate,
      amount: amountNum,
    });

    setFromDate('');
    setToDate('');
    setAmount('');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Plăți anticipate</h3>
        <p className="mt-1 text-sm text-slate-500">
          Adaugă plăți anticipate pentru a vedea cum afectează creditul tău.
        </p>
      </div>

      {/* Add payment form */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            <Calendar className="mr-1 inline h-4 w-4" />
            De la
          </label>
          <select
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-300 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat px-3 py-2.5 pr-10 text-sm
              text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Selectează</option>
            {availableDates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            <Calendar className="mr-1 inline h-4 w-4" />
            Până la
          </label>
          <select
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-300 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat px-3 py-2.5 pr-10 text-sm
              text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Selectează</option>
            {availableDates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            <Banknote className="mr-1 inline h-4 w-4" />
            Sumă (lei)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex: 5000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm
              text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAdd}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white
              transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            <Plus className="mr-1 inline h-4 w-4" />
            Adaugă
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Existing payments */}
      {payments.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium text-slate-700">Plăți adăugate:</p>
          {payments.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-4 py-2"
            >
              <span className="text-sm text-blue-800">
                {p.fromDate} — {p.toDate}: <strong>{p.amount.toLocaleString('ro-RO')} lei</strong>
              </span>
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
                aria-label="Elimină plata"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white
            transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          Calculează creditul
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700
            transition-colors hover:bg-slate-50"
        >
          Fără plăți anticipate
        </button>
      </div>
    </div>
  );
}
