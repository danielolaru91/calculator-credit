import type { CreditSummary } from '../../types/credit';
import { getBreakdownData } from '../../lib/credit/calculations';
import { formatLei } from '../../lib/credit/numberParser';

type CreditBreakdownProps = {
  summary: CreditSummary;
};

export function CreditBreakdown({ summary }: CreditBreakdownProps) {
  const breakdown = getBreakdownData(summary);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-slate-900">Unde se duc banii tăi?</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-left font-semibold text-slate-600">Categorie</th>
              <th className="pb-3 text-right font-semibold text-slate-600">Sumă</th>
              <th className="pb-3 text-right font-semibold text-slate-600">% din total</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map(row => (
              <tr key={row.category} className="border-b border-slate-100 last:border-0">
                <td className="py-3 font-medium text-slate-900">{row.category}</td>
                <td className="py-3 text-right text-slate-700">{row.amountFormatted}</td>
                <td className="py-3 text-right text-slate-700">{row.percentFormatted}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td className="pt-3 font-bold text-slate-900">Total</td>
              <td className="pt-3 text-right font-bold text-slate-900">
                {formatLei(summary.totalPaid)}
              </td>
              <td className="pt-3 text-right font-bold text-slate-900">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
