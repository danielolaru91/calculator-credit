export type CreditInstallment = {
  installmentNumber?: number;
  date?: string;
  payment?: number;
  principal?: number;
  interest?: number;
  fees?: number;
  remainingBalance?: number;
};

export type CreditSummary = {
  totalPaid: number;
  totalPrincipal: number;
  totalInterest: number;
  totalFees: number;
  numberOfInstallments: number;
};

export type ColumnMapping = {
  installmentNumber: string | null;
  date: string | null;
  payment: string | null;
  principal: string | null;
  interest: string | null;
  fees: string | null;
  remainingBalance: string | null;
};

export type ParsedData = {
  headers: string[];
  rows: string[][];
};

export type AppState =
  | 'idle'
  | 'file-selected'
  | 'parsing'
  | 'parsed'
  | 'needs-mapping'
  | 'calculating'
  | 'success'
  | 'error';

export type FileInfo = {
  name: string;
  size: number;
  type: string;
};

export type ValidationResult = {
  isValid: boolean;
  difference: number;
  message: string;
};

export type CreditChartEntry = {
  name: string;
  value: number;
  color: string;
};

export type EarlyPaymentSummary = {
  totalEarlyPayments: number;
  interestSaved: number;
  monthsReduced: number;
  originalFinalDate: string;
  newFinalDate: string;
};
