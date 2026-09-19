import type { CreditInstallment } from '../../types/credit';

/**
 * Mock credit schedule data for development and testing.
 * Simulates a 60-month credit (5 years) of 60,000 lei.
 */
export const mockInstallments: CreditInstallment[] = generateMockData();

function generateMockData(): CreditInstallment[] {
  const installments: CreditInstallment[] = [];
  const principalAmount = 60000;
  const annualInterestRate = 0.085; // 8.5%
  const monthlyRate = annualInterestRate / 12;
  const numberOfPayments = 60;

  // Calculate monthly payment using annuity formula
  const monthlyPayment =
    (principalAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  let remainingBalance = principalAmount;

  for (let i = 1; i <= numberOfPayments; i++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;

    const year = 2024 + Math.floor((i - 1) / 12);
    const month = ((i - 1) % 12) + 1;
    const dateStr = `${String(month).padStart(2, '0')}.${year}`;

    installments.push({
      installmentNumber: i,
      date: dateStr,
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      fees: 0,
      remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
    });
  }

  return installments;
}

/**
 * Generate CSV content from mock data for testing the CSV parser.
 */
export function generateMockCSV(): string {
  const headers = ['Nr. crt.', 'Data', 'Rata lunară', 'Principal', 'Dobândă', 'Comision', 'Sold rămas'];
  const rows = mockInstallments.map(inst => [
    String(inst.installmentNumber ?? ''),
    inst.date ?? '',
    inst.payment?.toFixed(2).replace('.', ',') ?? '',
    inst.principal?.toFixed(2).replace('.', ',') ?? '',
    inst.interest?.toFixed(2).replace('.', ',') ?? '',
    (inst.fees ?? 0).toFixed(2).replace('.', ','),
    inst.remainingBalance?.toFixed(2).replace('.', ',') ?? '',
  ]);

  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
}
