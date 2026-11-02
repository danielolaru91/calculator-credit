import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  FileInfo,
  ParsedData,
  ColumnMapping,
  CreditInstallment,
  CreditSummary as CreditSummaryType,
} from '../../types/credit';
import { parseCSV } from '../../lib/parsers/csvParser';
import { parseXLSX } from '../../lib/parsers/xlsxParser';
import { parseXLS } from '../../lib/parsers/xlsParser';
import { parsePDF } from '../../lib/parsers/pdfParser';
import { detectColumns } from '../../lib/credit/columnDetection';
import { normalizeInstallments } from '../../lib/credit/normalization';
import { parseCreditDate } from '../../lib/credit/dates';
import { calculateCreditSummary, getChartData } from '../../lib/credit/calculations';
import { formatLei } from '../../lib/credit/numberParser';
import { mockInstallments } from '../../lib/credit/mockData';

import { CreditUploader } from './CreditUploader';
import { EarlyPaymentForm, type EarlyPayment } from './EarlyPaymentForm';
import { CreditChart } from './CreditChart';
import { AmortizationTable } from './AmortizationTable';

type Phase = 'idle' | 'parsing' | 'calculating' | 'success' | 'error';

function formatRateCount(count: number): string {
  return count === 1 ? '1 rată' : `${count} rate`;
}


function getLastInstallmentDate(rows: CreditInstallment[]): Date | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const date = parseCreditDate(rows[i].date);
    if (date) return date;
  }

  return null;
}

function formatDateRo(date: Date | null): string {
  if (!date) return 'Nedisponibil';

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getMonthsBetween(start: Date, end: Date): number {
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    end.getMonth() -
    start.getMonth();

  if (end.getDate() < start.getDate()) {
    months--;
  }

  return Math.max(0, months);
}

function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'an' : 'ani'}`);
  }

  if (remainingMonths > 0) {
    parts.push(
      `${remainingMonths} ${
        remainingMonths === 1 ? 'lună' : 'luni'
      }`
    );
  }

  return parts.length > 0 ? parts.join(' și ') : '0 luni';
}


export function CreditCalculator() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [installments, setInstallments] = useState<CreditInstallment[]>([]);
  const [summary, setSummary] = useState<CreditSummaryType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]);
  const [appliedPayments, setAppliedPayments] = useState<EarlyPayment[]>([]);
  const [showEarlyPayment, setShowEarlyPayment] = useState(false);

  const reset = useCallback(() => {
    setPhase('idle');
    setFileInfo(null);
    setParsedData(null);
    setMapping(null);
    setInstallments([]);
    setSummary(null);
    setError(null);
    setEarlyPayments([]);
    setAppliedPayments([]);
    setShowEarlyPayment(false);
  }, []);

  const doCalculate = useCallback((payments: EarlyPayment[] = []) => {
    if (!parsedData || !mapping) return;

    setPhase('calculating');

    setTimeout(() => {
      let normalizedInstallments = normalizeInstallments(parsedData, mapping);

      if (payments.length > 0) {
        normalizedInstallments = applyEarlyPayments(normalizedInstallments, payments).installments;
      }

      const creditSummary = calculateCreditSummary(normalizedInstallments);

      setInstallments(normalizedInstallments);
      setSummary(creditSummary);
      setAppliedPayments(payments);
      setPhase('success');
    }, 500);
  }, [parsedData, mapping]);

  const processFile = useCallback(async (file: File) => {
    setPhase('parsing');
    setError(null);

    try {
      const info: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      setFileInfo(info);

      let data: ParsedData;

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const mime = file.type;

      if (ext === 'csv' || mime === 'text/csv') {
        const text = await file.text();
        data = parseCSV(text);
      } else if (ext === 'xlsx' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const buffer = await file.arrayBuffer();
        data = parseXLSX(buffer);
      } else if (ext === 'xls' || mime === 'application/vnd.ms-excel') {
        const buffer = await file.arrayBuffer();
        data = parseXLS(buffer);
      } else if (ext === 'pdf' || mime === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        data = await parsePDF(buffer);
      } else {
        throw new Error('Formatul fișierului nu este suportat.');
      }

      if (data.rows.length === 0) {
        throw new Error('Nu am găsit date în fișierul încărcat.');
      }

      const detectedMapping = detectColumns(data.headers);

      if (!detectedMapping.principal && !detectedMapping.interest) {
        throw new Error(
          'Nu am putut identifica coloanele pentru principal sau dobândă. Încearcă cu un alt fișier.'
        );
      }

      setParsedData(data);
      setMapping(detectedMapping);

      // Calculate immediately
      setPhase('calculating');
      setTimeout(() => {
        const normalizedInstallments = normalizeInstallments(data, detectedMapping);
        const creditSummary = calculateCreditSummary(normalizedInstallments);

        setInstallments(normalizedInstallments);
        setSummary(creditSummary);
        setPhase('success');
      }, 500);
    } catch (err) {
      setPhase('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Nu am putut procesa fișierul. Încearcă cu un alt format.'
      );
    }
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      processFile(file);
    },
    [processFile]
  );

  const handleFileRemove = useCallback(() => {
    reset();
  }, [reset]);

  const handleDemoLoad = useCallback(() => {
    setPhase('calculating');
    setFileInfo({ name: 'exemplu_credit_demo.csv', size: 0, type: 'text/csv' });

    setTimeout(() => {
      const demoInstallments = mockInstallments;
      const demoSummary = calculateCreditSummary(demoInstallments);

      setInstallments(demoInstallments);
      setSummary(demoSummary);
      setPhase('success');
    }, 800);
  }, []);

  const handleAddEarlyPayment = useCallback((payment: EarlyPayment) => {
    setEarlyPayments(prev => [...prev, payment]);
  }, []);

  const handleRemoveEarlyPayment = useCallback((id: string) => {
    setEarlyPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleRecalculateWithPayments = useCallback(() => {
    doCalculate(earlyPayments);
  }, [doCalculate, earlyPayments]);

  const handleLoadAnother = useCallback(() => {
    reset();
  }, [reset]);

  const originalInstallments = parsedData && mapping
    ? normalizeInstallments(parsedData, mapping)
    : [];

  const originalSummary =
    originalInstallments.length > 0 ? calculateCreditSummary(originalInstallments) : null;

  const showComparison = appliedPayments.length > 0 && originalSummary !== null;
  const totalEarlyPayments = appliedPayments.reduce((sum, payment) => sum + payment.amount, 0);


const today = new Date();

const originalEndDate = getLastInstallmentDate(originalInstallments);
const adjustedEndDate = getLastInstallmentDate(installments);

const originalRemainingMonths = originalEndDate
  ? getMonthsBetween(today, originalEndDate)
  : null;

const adjustedRemainingMonths = adjustedEndDate
  ? getMonthsBetween(today, adjustedEndDate)
  : null;

const reducedMonths =
  originalEndDate && adjustedEndDate
    ? getMonthsBetween(adjustedEndDate, originalEndDate)
    : null;

const originalEndDateLabel = formatDateRo(originalEndDate);
const adjustedEndDateLabel = formatDateRo(adjustedEndDate);

const originalRemainingLabel =
  originalRemainingMonths !== null
    ? formatMonths(originalRemainingMonths)
    : undefined;

const adjustedRemainingLabel =
  adjustedRemainingMonths !== null
    ? formatMonths(adjustedRemainingMonths)
    : undefined;

const reducedPeriodLabel =
  reducedMonths !== null && reducedMonths > 0
    ? formatMonths(reducedMonths)
    : undefined;


  const earlyPaymentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showEarlyPayment && earlyPaymentRef.current) {
      setTimeout(() => {
        earlyPaymentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [showEarlyPayment]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Calculează cât te costă cu adevărat creditul
          </h1>
          <p className="mx-auto mb-4 max-w-2xl text-lg text-slate-600">
            Încarcă scadențarul creditului tău și vezi instant cât ai plătit în principal & dobândă.
          </p>
          <p className="text-sm text-slate-400">
            Calculul se face local în browser. Documentul tău nu este încărcat pe un server.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Upload Area */}
          {(phase === 'idle' || phase === 'error') && (
            <CreditUploader
              fileInfo={fileInfo}
              state={phase}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              onDemoLoad={handleDemoLoad}
            />
          )}

          {/* Error State */}
          {phase === 'error' && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="mb-4 text-sm text-red-800">{error}</p>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white
                  transition-colors hover:bg-red-700"
              >
                Încearcă din nou
              </button>
            </div>
          )}

          {/* Parsing / Calculating State */}
          {(phase === 'parsing' || phase === 'calculating') && fileInfo && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
              <p className="text-sm text-slate-600">
                {phase === 'parsing' ? 'Se procesează fișierul...' : 'Se calculează...'}
              </p>
            </div>
          )}

          {/* Results */}
          {phase === 'success' && summary && (
            <>

{showComparison && originalSummary ? (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <CreditChart
      data={getChartData(originalSummary)}
      summary={originalSummary}
      subtitle={`Fără plăți anticipate · ${formatRateCount(originalSummary.numberOfInstallments)}`}
      compact
      endDate={originalEndDateLabel}
      remainingPeriod={originalRemainingLabel}
    />

    <CreditChart
      data={getChartData(summary)}
      summary={summary}
      subtitle={`Cu plăți anticipate · ${formatRateCount(summary.numberOfInstallments)}`}
      compact
      endDate={adjustedEndDateLabel}
      remainingPeriod={adjustedRemainingLabel}
      reducedPeriod={reducedPeriodLabel}
    />
  </div>
) : (
  <CreditChart
    data={getChartData(summary)}
    summary={summary}
    subtitle={formatRateCount(summary.numberOfInstallments)}
    endDate={originalEndDateLabel}
    remainingPeriod={originalRemainingLabel}
  />
)}


              {/* Early Payment Section */}
              {originalInstallments.length > 0 && (
                <div ref={earlyPaymentRef} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  {!showEarlyPayment ? (
                    <button
                      type="button"
                      onClick={() => setShowEarlyPayment(true)}
                      className="w-full rounded-lg border-2 border-dashed border-slate-300 px-6 py-4 text-sm font-medium text-slate-600
                        transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                    >
                      + Adaugă plăți anticipate
                    </button>
                  ) : (
                    <EarlyPaymentForm
                      installments={originalInstallments}
                      payments={earlyPayments}
                      onAdd={handleAddEarlyPayment}
                      onRemove={handleRemoveEarlyPayment}
                      onContinue={handleRecalculateWithPayments}
                      onSkip={() => {
                        setShowEarlyPayment(false);
                        setEarlyPayments([]);
                        doCalculate([]);
                      }}
                    />
                  )}
                </div>
              )}

              <AmortizationTable installments={installments} />

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleLoadAnother}
                  className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700
                    transition-colors hover:bg-slate-50"
                >
                  Încarcă alt scadențar
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-200 pt-8 text-center">
          <p className="text-sm text-slate-400">
            Fișierul este procesat local pe dispozitivul tău. Nu îl încărcăm pe server.
          </p>
        </footer>
      </div>
    </div>
  );
}

function toDateKey(value?: string): string | null {
  const date = parseCreditDate(value);
  if (!date) return value ?? null;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function findDateIndex(rows: CreditInstallment[], date?: string): number {
  const targetKey = toDateKey(date);
  if (!targetKey) return -1;
  return rows.findIndex(row => toDateKey(row.date) === targetKey);
}

function applyEarlyPayments(
  installments: CreditInstallment[],
  payments: EarlyPayment[]
): { installments: CreditInstallment[]; appliedTotal: number } {
  const result = installments.map(inst => ({ ...inst }));
  let appliedTotal = 0;

  const balanceBefore: number[] = installments.map((inst, i) => {
    if (i === 0) {
      return (inst.remainingBalance ?? 0) + (inst.principal ?? 0);
    }
    return installments[i - 1]?.remainingBalance ?? 0;
  });
  const monthlyRates: number[] = installments.map((inst, i) => {
    const bal = balanceBefore[i] ?? 0;
    return bal > 0 ? (inst.interest ?? 0) / bal : 0;
  });
  const firstBalance = balanceBefore[0] ?? 0;

  for (const payment of payments) {
    const fromIdx = findDateIndex(result, payment.fromDate);
    const toIdx = findDateIndex(result, payment.toDate);
    if (fromIdx === -1) continue;
    const endIdx = toIdx === -1 ? fromIdx : toIdx;

    let currentBalance =
      fromIdx > 0
        ? (result[fromIdx - 1].remainingBalance ?? 0)
        : firstBalance;

    for (let i = fromIdx; i <= endIdx; i++) {
      const inst = result[i];
      const orig = installments[i];
      if (!inst || !orig) continue;
      if (currentBalance <= 0) {
        inst.principal = 0;
        inst.earlyPayment = 0;
        inst.interest = 0;
        inst.payment = 0;
        inst.remainingBalance = 0;
        continue;
      }

      // Platile anticipate deja existente in scadentar raman neatinse.
      if (orig.isExtraPayment) {
        const principal = Math.min(orig.principal ?? 0, currentBalance);
        const newBalance = Math.max(0, currentBalance - principal);
        inst.principal = Math.round(principal * 100) / 100;
        inst.earlyPayment = 0;
        inst.interest = 0;
        inst.fees = 0;
        inst.payment = Math.round(principal * 100) / 100;
        inst.remainingBalance = Math.round(newBalance * 100) / 100;
        currentBalance = newBalance;
        continue;
      }

      const originalPayment =
        orig.payment ?? (orig.principal ?? 0) + (orig.interest ?? 0) + (orig.fees ?? 0);
      const fees = orig.fees ?? 0;
      const rate = monthlyRates[i] ?? 0;
      const interest = Math.round(currentBalance * rate * 100) / 100;
      // Comisioanele/asigurarea fac parte din rata, dar nu ramburseaza principal.
      const basePrincipal = Math.max(0, originalPayment - interest - fees);
      const principalWithoutExtra = Math.min(basePrincipal, currentBalance);
      const newPrincipal = Math.min(basePrincipal + payment.amount, currentBalance);
      // Plata anticipata se afiseaza separat, fara sa umfle coloana de principal.
      const earlyAmount = Math.max(0, newPrincipal - principalWithoutExtra);
      appliedTotal = Math.round((appliedTotal + earlyAmount) * 100) / 100;
      const newBalance = Math.max(0, currentBalance - newPrincipal);

      inst.fees = fees;
      inst.interest = interest;
      inst.principal = Math.round(principalWithoutExtra * 100) / 100;
      inst.earlyPayment = Math.round(earlyAmount * 100) / 100;
      inst.payment = Math.round((newPrincipal + interest + fees) * 100) / 100;
      inst.remainingBalance = Math.round(newBalance * 100) / 100;
      currentBalance = newBalance;
    }

    for (let i = endIdx + 1; i < result.length; i++) {
      const inst = result[i];
      const orig = installments[i];
      if (!inst || !orig) continue;
      if (currentBalance <= 0) {
        inst.principal = 0;
        inst.earlyPayment = 0;
        inst.interest = 0;
        inst.payment = 0;
        inst.remainingBalance = 0;
        continue;
      }

      // Platile anticipate deja existente in scadentar raman neatinse.
      if (orig.isExtraPayment) {
        const principal = Math.min(orig.principal ?? 0, currentBalance);
        const newBalance = Math.max(0, currentBalance - principal);
        inst.principal = Math.round(principal * 100) / 100;
        inst.earlyPayment = 0;
        inst.interest = 0;
        inst.fees = 0;
        inst.payment = Math.round(principal * 100) / 100;
        inst.remainingBalance = Math.round(newBalance * 100) / 100;
        currentBalance = newBalance;
        continue;
      }

      const originalPayment =
        orig.payment ?? (orig.principal ?? 0) + (orig.interest ?? 0) + (orig.fees ?? 0);
      const fees = orig.fees ?? 0;
      const rate = monthlyRates[i] ?? 0;
      const interest = Math.round(currentBalance * rate * 100) / 100;
      const principal = Math.min(
        Math.max(0, originalPayment - interest - fees),
        currentBalance
      );
      const newBalance = Math.max(0, currentBalance - principal);

      inst.fees = fees;
      inst.interest = interest;
      inst.principal = Math.round(principal * 100) / 100;
      inst.earlyPayment = 0;
      inst.payment = Math.round((principal + interest + fees) * 100) / 100;
      inst.remainingBalance = Math.round(newBalance * 100) / 100;
      currentBalance = newBalance;
    }
  }

  const filtered = result.filter((inst, i) => {
    if (i === 0) return true;
    return (inst.payment ?? 0) > 0;
  });

  // Metoda ING: plata anticipata acopera principalul urmatoarelor rate.
  // Numarul de luni taiate = suma / principalul ratei urmatoare.
  const originalMonthlyCount = installments.filter(i => !i.isExtraPayment).length;
  let monthsToCut = 0;

  for (const payment of payments) {
    const fromIdx = findDateIndex(installments, payment.fromDate);
    if (fromIdx === -1) continue;

    let nextPrincipal = 0;
    for (let i = fromIdx + 1; i < installments.length; i++) {
      if (!installments[i].isExtraPayment) {
        nextPrincipal = installments[i].principal ?? 0;
        break;
      }
    }
    if (nextPrincipal <= 0) {
      nextPrincipal = installments[fromIdx]?.principal ?? 0;
    }
    if (nextPrincipal > 0) {
      monthsToCut += Math.floor(payment.amount / nextPrincipal);
    }
  }

  let finalRows = filtered;

  if (monthsToCut > 0) {
    const desiredMonthlyCount = Math.max(1, originalMonthlyCount - monthsToCut);
    const monthlyIndices = filtered
      .map((row, i) => (!row.isExtraPayment ? i : -1))
      .filter(i => i >= 0);

    if (monthlyIndices.length > desiredMonthlyCount) {
      const cutIndex = monthlyIndices[desiredMonthlyCount - 1];
      const kept = filtered.slice(0, cutIndex + 1);
      const removed = filtered.slice(cutIndex + 1);

      // Principalul ratelor eliminate se redistribuie pe ratele ramase,
      // ca scadentarul sa se inchida la noua maturitate.
      const removedPrincipal = removed.reduce(
        (sum, row) => sum + (row.principal ?? 0) + (row.earlyPayment ?? 0),
        0
      );
      const paymentDates = new Set(payments.map(p => toDateKey(p.fromDate)));
      const keptMonthly = kept.filter(
        row => !row.isExtraPayment && !paymentDates.has(toDateKey(row.date) ?? '')
      );
      const rowsToAdjust =
        keptMonthly.length > 0
          ? keptMonthly
          : kept.filter(row => !row.isExtraPayment);
      const addPerRow = rowsToAdjust.length > 0 ? removedPrincipal / rowsToAdjust.length : 0;

      if (addPerRow > 0) {
        for (const row of rowsToAdjust) {
          row.principal = Math.round(((row.principal ?? 0) + addPerRow) * 100) / 100;
          row.payment = Math.round(((row.payment ?? 0) + addPerRow) * 100) / 100;
        }

        let balance = firstBalance;
        for (const row of kept) {
          balance = Math.max(
            0,
            Math.round((balance - (row.principal ?? 0) - (row.earlyPayment ?? 0)) * 100) / 100
          );
          row.remainingBalance = balance;
        }
      }

      finalRows = kept;
    }
  }

  let rateNumber = 0;

  return {
    installments: finalRows.map(inst => {
      if (inst.isExtraPayment) {
        return { ...inst, installmentNumber: rateNumber };
      }
      rateNumber += 1;
      return { ...inst, installmentNumber: rateNumber };
    }),
    appliedTotal: Math.round(appliedTotal * 100) / 100,
  };
}
