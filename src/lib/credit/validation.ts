import type { CreditInstallment, ValidationResult } from '../../types/credit';

/**
 * Validate credit data consistency.
 * Checks if principal + interest + fees ≈ total payment.
 */
export function validateCreditData(installments: CreditInstallment[]): ValidationResult {
  const tolerance = 0.05 * installments.length; // Allow 0.05 lei tolerance per row
  let totalDifference = 0;
  let hasPaymentColumn = false;
  let hasComponentColumns = false;

  for (const inst of installments) {
    const hasPayment = inst.payment !== undefined && inst.payment > 0;
    const hasPrincipal = inst.principal !== undefined && inst.principal > 0;
    const hasInterest = inst.interest !== undefined && inst.interest > 0;

    if (hasPayment) hasPaymentColumn = true;
    if (hasPrincipal || hasInterest) hasComponentColumns = true;

    if (hasPayment && hasPrincipal) {
      const expected = (inst.principal ?? 0) + (inst.interest ?? 0) + (inst.fees ?? 0);
      const actual = inst.payment ?? 0;
      totalDifference += Math.abs(expected - actual);
    }
  }

  if (!hasPaymentColumn || !hasComponentColumns) {
    return {
      isValid: true,
      difference: 0,
      message: 'Datele au fost procesate cu succes.',
    };
  }

  if (totalDifference <= tolerance) {
    return {
      isValid: true,
      difference: totalDifference,
      message: 'Datele scadențarului au fost verificate. Valorile sunt consistente.',
    };
  }

  return {
    isValid: false,
    difference: totalDifference,
    message: `Atenție: valorile din scadențar nu se potrivesc perfect. Diferența totală este de ${totalDifference.toFixed(2)} lei. Banca poate include alte costuri sau componente în rata totală.`,
  };
}
