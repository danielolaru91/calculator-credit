import { TrendingUp, TrendingDown, Hash, Wallet } from 'lucide-react';
import type { CreditSummary as CreditSummaryType } from '../../types/credit';
import { formatLei } from '../../lib/credit/numberParser';

type CreditSummaryProps = {
  summary: CreditSummaryType;
};

export function CreditSummary({ summary }: CreditSummaryProps) {
  const cards = [
    {
      label: 'Total plătit',
      value: formatLei(summary.totalPaid),
      icon: Wallet,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Principal plătit',
      value: formatLei(summary.totalPrincipal),
      icon: TrendingDown,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: 'Dobândă plătită',
      value: formatLei(summary.totalInterest),
      icon: TrendingUp,
      color: 'bg-amber-50 text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Număr rate',
      value: `${summary.numberOfInstallments} rate`,
      icon: Hash,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(card => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className={`rounded-lg p-2 ${card.iconBg}`}>
              <card.icon className={`h-4 w-4 ${card.color.split(' ')[1]}`} />
            </div>
            <span className="text-sm font-medium text-slate-500">{card.label}</span>
          </div>
          <p className="text-xl font-bold text-slate-900 sm:text-2xl">{card.value}</p>
        </div>
      ))}

      {summary.totalFees > 0 && (
        <div className="sm:col-span-2 lg:col-span-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Comisioane totale: <span className="font-bold">{formatLei(summary.totalFees)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
