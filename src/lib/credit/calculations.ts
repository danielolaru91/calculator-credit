import type { CreditInstallment, CreditSummary, CreditChartEntry } from '../../types/credit';

/**
 * Calculate credit summary from installments.
 */
export function calculateCreditSummary(installments: CreditInstallment[]): CreditSummary {
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalFees = 0;

  for (const inst of installments) {
    // Platile anticipate raman in totaluri (ca inainte), dar sunt afisate
    // separat in tabel, nu in coloana de principal.
    totalPrincipal += (inst.principal ?? 0) + (inst.earlyPayment ?? 0);
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
