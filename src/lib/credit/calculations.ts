import type { CreditInstallment, CreditSummary, CreditChartEntry } from '../../types/credit';
import { formatLei, formatPercent } from './numberParser';

/**
 * Calculate credit summary from installments.
 */
export function calculateCreditSummary(installments: CreditInstallment[]): CreditSummary {
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalFees = 0;

  for (const inst of installments) {
    totalPrincipal += inst.principal ?? 0;
    totalInterest += inst.interest ?? 0;
    totalFees += inst.fees ?? 0;
  }

  const totalPaid = totalPrincipal + totalInterest + totalFees;

  // Platile anticipate nu sunt rate: raman in totaluri, dar nu se numara.
  const monthlyCount = installments.filter(inst => !inst.isExtraPayment).length;

  return {
    totalPaid,
    totalPrincipal,
    totalInterest,
    totalFees,
    numberOfInstallments: monthlyCount > 0 ? monthlyCount : installments.length,
  };
}

/**
 * Generate chart data from summary.
 * Doar Principal + Dobanda — comisioanele/asigurarile raman in totaluri,
 * dar nu se afiseaza defalcat (decizie UI).
 */
export function getChartData(summary: CreditSummary): CreditChartEntry[] {
  const entries: CreditChartEntry[] = [
    {
      name: 'Principal',
      value: summary.totalPrincipal,
      color: '#3b82f6', // blue
    },
    {
      name: 'Dobândă',
      value: summary.totalInterest,
      color: '#f59e0b', // amber
    },
  ];

  return entries;
}

/**
 * Get breakdown table data.
 * Doar Principal + Dobanda (procente din totalul platit, care include si
 * comisioanele/asigurarile — ele raman in calcule, dar nu se afiseaza).
 */
export function getBreakdownData(summary: CreditSummary) {
  const data = [
    {
      category: 'Principal',
      amount: summary.totalPrincipal,
      amountFormatted: formatLei(summary.totalPrincipal),
      percent: summary.totalPaid > 0 ? (summary.totalPrincipal / summary.totalPaid) * 100 : 0,
      percentFormatted:
        summary.totalPaid > 0
          ? formatPercent((summary.totalPrincipal / summary.totalPaid) * 100)
          : '0%',
    },
    {
      category: 'Dobândă',
      amount: summary.totalInterest,
      amountFormatted: formatLei(summary.totalInterest),
      percent: summary.totalPaid > 0 ? (summary.totalInterest / summary.totalPaid) * 100 : 0,
      percentFormatted:
        summary.totalPaid > 0
          ? formatPercent((summary.totalInterest / summary.totalPaid) * 100)
          : '0%',
    },
  ];

  return data;
}
