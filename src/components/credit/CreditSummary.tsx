import { TrendingUp, TrendingDown, Hash, Wallet, PiggyBank, Timer, CalendarClock, Receipt } from 'lucide-react';
import type { CreditSummary as CreditSummaryType, EarlyPaymentSummary } from '../../types/credit';
import { formatLei } from '../../lib/credit/numberParser';

type CreditSummaryProps = {
  summary: CreditSummaryType;
  earlyPaymentSummary?: EarlyPaymentSummary | null;
};

function formatPeriod(months: number): string {
  if (months <= 0) return '0 luni';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return remainingMonths === 1 ? '1 lună' : `${remainingMonths} luni`;
  }

  if (remainingMonths === 0) {
    return years === 1 ? '1 an' : `${years} ani`;
  }

  const yearPart = years === 1 ? '1 an' : `${years} ani`;
  const monthPart = remainingMonths === 1 ? '1 lună' : `${remainingMonths} luni`;
  return `${yearPart} și ${monthPart}`;
}

export function CreditSummary({ summary, earlyPaymentSummary }: CreditSummaryProps) {
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

  const earlyPaymentCards = earlyPaymentSummary ? [
    {
      label: 'Plăți anticipate',
      value: formatLei(earlyPaymentSummary.totalEarlyPayments),
      icon: PiggyBank,
      color: 'bg-teal-50 text-teal-600',
      iconBg: 'bg-teal-100',
    },
    {
      label: 'Dobândă economisită',
      value: formatLei(earlyPaymentSummary.interestSaved),
      icon: Receipt,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Perioada redusă',
      value: formatPeriod(earlyPaymentSummary.monthsReduced),
      icon: Timer,
      color: 'bg-orange-50 text-orange-600',
      iconBg: 'bg-orange-100',
    },
    {
      label: 'Finalizare credit',
      value: null,
      icon: CalendarClock,
      color: 'bg-indigo-50 text-indigo-600',
      iconBg: 'bg-indigo-100',
      subtitle: ` Inițial: ${earlyPaymentSummary.originalFinalDate}\n Nou: ${earlyPaymentSummary.newFinalDate}`,
    },
  ] : [];

  return (
    <div className="space-y-4">
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
      </div>

      {earlyPaymentCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {earlyPaymentCards.map(card => (
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
              {card.value !== null ? (
                <p className="text-xl font-bold text-slate-900 sm:text-2xl">{card.value}</p>
              ) : (
                <div className="space-y-1">
                  {'subtitle' in card && card.subtitle?.split('\n').map((line, i) => (
                    <p key={i} className="text-sm text-slate-700">{line.trim()}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {summary.totalFees > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Comisioane totale: <span className="font-bold">{formatLei(summary.totalFees)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
