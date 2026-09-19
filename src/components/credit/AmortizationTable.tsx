import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import type { CreditInstallment } from '../../types/credit';
import { formatLei } from '../../lib/credit/numberParser';

type AmortizationTableProps = {
  installments: CreditInstallment[];
};

type SortKey = keyof CreditInstallment;
type SortDir = 'asc' | 'desc';

const ROWS_PER_PAGE = 15;

export function AmortizationTable({ installments }: AmortizationTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('installmentNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    const copy = [...installments];
    copy.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return copy;
  }, [installments, sortKey, sortDir]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(row =>
      Object.values(row).some(v =>
        String(v ?? '').toLowerCase().includes(q)
      )
    );
  }, [sorted, search]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paged = filtered.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="inline h-3 w-3" />
    ) : (
      <ChevronDown className="inline h-3 w-3" />
    );
  };

  // Detect which columns have data
  const hasDate = installments.some(i => i.date);
  const hasPayment = installments.some(i => i.payment !== undefined && i.payment > 0);
  const hasPrincipal = installments.some(i => i.principal !== undefined && i.principal > 0);
  const hasInterest = installments.some(i => i.interest !== undefined && i.interest > 0);
  const hasFees = installments.some(i => i.fees !== undefined && i.fees > 0);
  const hasBalance = installments.some(i => i.remainingBalance !== undefined && i.remainingBalance > 0);

  const thClass =
    'cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-600 hover:text-slate-900';
  const tdClass = 'whitespace-nowrap px-3 py-2.5 text-slate-700';

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h3 className="text-lg font-semibold text-slate-900">Scadențar complet</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Caută..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm
              focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className={thClass} onClick={() => handleSort('installmentNumber')}>
                Nr. rată <SortIcon column="installmentNumber" />
              </th>
              {hasDate && (
                <th className={thClass} onClick={() => handleSort('date')}>
                  Data <SortIcon column="date" />
                </th>
              )}
              {hasPayment && (
                <th className={thClass} onClick={() => handleSort('payment')}>
                  Rată totală <SortIcon column="payment" />
                </th>
              )}
              {hasPrincipal && (
                <th className={thClass} onClick={() => handleSort('principal')}>
                  Principal <SortIcon column="principal" />
                </th>
              )}
              {hasInterest && (
                <th className={thClass} onClick={() => handleSort('interest')}>
                  Dobândă <SortIcon column="interest" />
                </th>
              )}
              {hasFees && (
                <th className={thClass} onClick={() => handleSort('fees')}>
                  Comision <SortIcon column="fees" />
                </th>
              )}
              {hasBalance && (
                <th className={thClass} onClick={() => handleSort('remainingBalance')}>
                  Sold rămas <SortIcon column="remainingBalance" />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 transition-colors hover:bg-slate-50/50 last:border-0"
              >
                <td className={tdClass}>{row.installmentNumber ?? '—'}</td>
                {hasDate && <td className={tdClass}>{row.date ?? '—'}</td>}
                {hasPayment && (
                  <td className={tdClass}>
                    {row.payment !== undefined && row.payment > 0 ? formatLei(row.payment) : '—'}
                  </td>
                )}
                {hasPrincipal && (
                  <td className={tdClass}>
                    {row.principal !== undefined && row.principal > 0 ? formatLei(row.principal) : '—'}
                  </td>
                )}
                {hasInterest && (
                  <td className={tdClass}>
                    {row.interest !== undefined && row.interest > 0 ? formatLei(row.interest) : '—'}
                  </td>
                )}
                {hasFees && (
                  <td className={tdClass}>
                    {row.fees !== undefined && row.fees > 0 ? formatLei(row.fees) : '—'}
                  </td>
                )}
                {hasBalance && (
                  <td className={tdClass}>
                    {row.remainingBalance !== undefined
                      ? formatLei(row.remainingBalance)
                      : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-sm text-slate-500">
            {filtered.length} rate · Pagina {page + 1} din {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700
                transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700
                transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Următor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
