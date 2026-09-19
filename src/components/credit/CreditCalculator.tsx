import { useState, useCallback } from 'react';
import type {
  FileInfo,
  ParsedData,
  ColumnMapping,
  CreditInstallment,
  CreditSummary as CreditSummaryType,
  ValidationResult,
  EarlyPaymentSummary,
} from '../../types/credit';
import { parseCSV } from '../../lib/parsers/csvParser';
import { parseXLSX } from '../../lib/parsers/xlsxParser';
import { parseXLS } from '../../lib/parsers/xlsParser';
import { parsePDF } from '../../lib/parsers/pdfParser';
import { detectColumns } from '../../lib/credit/columnDetection';
import { normalizeInstallments } from '../../lib/credit/normalization';
import { calculateCreditSummary, getChartData } from '../../lib/credit/calculations';
import { validateCreditData } from '../../lib/credit/validation';
import { mockInstallments } from '../../lib/credit/mockData';

import { CreditUploader } from './CreditUploader';
import { EarlyPaymentForm, type EarlyPayment } from './EarlyPaymentForm';
import { CreditSummary } from './CreditSummary';
import { CreditChart } from './CreditChart';
import { CreditBreakdown } from './CreditBreakdown';
import { AmortizationTable } from './AmortizationTable';
import { ValidationMessage } from './ValidationMessage';

type Phase = 'idle' | 'parsing' | 'calculating' | 'success' | 'error';

export function CreditCalculator() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [installments, setInstallments] = useState<CreditInstallment[]>([]);
  const [summary, setSummary] = useState<CreditSummaryType | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]);
  const [appliedEarlyTotal, setAppliedEarlyTotal] = useState(0);
  const [showEarlyPayment, setShowEarlyPayment] = useState(false);

  const reset = useCallback(() => {
    setPhase('idle');
    setFileInfo(null);
    setParsedData(null);
    setMapping(null);
    setInstallments([]);
    setSummary(null);
    setValidation(null);
    setError(null);
    setEarlyPayments([]);
    setAppliedEarlyTotal(0);
    setShowEarlyPayment(false);
  }, []);

  const doCalculate = useCallback((payments: EarlyPayment[] = []) => {
    if (!parsedData || !mapping) return;

    setPhase('calculating');

    setTimeout(() => {
      let normalizedInstallments = normalizeInstallments(parsedData, mapping);

      if (payments.length > 0) {
        const applied = applyEarlyPayments(normalizedInstallments, payments);
        normalizedInstallments = applied.installments;
        setAppliedEarlyTotal(applied.appliedTotal);
      } else {
        setAppliedEarlyTotal(0);
      }

      const creditSummary = calculateCreditSummary(normalizedInstallments);
      const validationResult = validateCreditData(normalizedInstallments);

      setInstallments(normalizedInstallments);
      setSummary(creditSummary);
      setValidation(validationResult);
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
        const validationResult = validateCreditData(normalizedInstallments);

        setInstallments(normalizedInstallments);
        setSummary(creditSummary);
        setValidation(validationResult);
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
      const demoValidation = validateCreditData(demoInstallments);

      setInstallments(demoInstallments);
      setSummary(demoSummary);
      setValidation(demoValidation);
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

  const earlyPaymentSummary: EarlyPaymentSummary | null = earlyPayments.length > 0 && installments.length > 0
    ? (() => {
        const originalSummary = calculateCreditSummary(originalInstallments);
        const originalFinalDate = originalInstallments[originalInstallments.length - 1]?.date ?? '—';
        const newFinalDate = installments[installments.length - 1]?.date ?? '—';
        return {
          totalEarlyPayments: appliedEarlyTotal,
          interestSaved: originalSummary.totalInterest - (summary?.totalInterest ?? 0),
          monthsReduced: originalSummary.numberOfInstallments - (summary?.numberOfInstallments ?? 0),
          originalFinalDate,
          newFinalDate,
        };
      })()
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Calculează cât te costă cu adevărat creditul
          </h1>
          <p className="mx-auto mb-4 max-w-2xl text-lg text-slate-600">
            Încarcă scadențarul creditului tău și vezi instant cât ai plătit în principal, dobândă și comisioane.
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
              <CreditSummary summary={summary} earlyPaymentSummary={earlyPaymentSummary} />

              {validation && <ValidationMessage result={validation} />}

              <CreditChart data={getChartData(summary)} summary={summary} />

              <CreditBreakdown summary={summary} />

              {/* Early Payment Section */}
              {originalInstallments.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
    const fromIdx = result.findIndex(i => i.date === payment.fromDate);
    const toIdx = result.findIndex(i => i.date === payment.toDate);
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
        inst.interest = 0;
        inst.payment = 0;
        inst.remainingBalance = 0;
        continue;
      }

      const originalPayment = orig.payment ?? inst.payment ?? 0;
      const rate = monthlyRates[i] ?? 0;
      const interest = Math.round(currentBalance * rate * 100) / 100;
      const basePrincipal = Math.max(0, originalPayment - interest);
      const principalWithoutExtra = Math.min(basePrincipal, currentBalance);
      const newPrincipal = Math.min(basePrincipal + payment.amount, currentBalance);
      appliedTotal = Math.round((appliedTotal + (newPrincipal - principalWithoutExtra)) * 100) / 100;
      const newBalance = Math.max(0, currentBalance - newPrincipal);

      inst.interest = interest;
      inst.principal = Math.round(newPrincipal * 100) / 100;
      inst.payment = Math.round((newPrincipal + interest) * 100) / 100;
      inst.remainingBalance = Math.round(newBalance * 100) / 100;
      currentBalance = newBalance;
    }

    for (let i = endIdx + 1; i < result.length; i++) {
      const inst = result[i];
      const orig = installments[i];
      if (!inst || !orig) continue;
      if (currentBalance <= 0) {
        inst.principal = 0;
        inst.interest = 0;
        inst.payment = 0;
        inst.remainingBalance = 0;
        continue;
      }

      const originalPayment = orig.payment ?? inst.payment ?? 0;
      const rate = monthlyRates[i] ?? 0;
      const interest = Math.round(currentBalance * rate * 100) / 100;
      const principal = Math.min(Math.max(0, originalPayment - interest), currentBalance);
      const newBalance = Math.max(0, currentBalance - principal);

      inst.interest = interest;
      inst.principal = Math.round(principal * 100) / 100;
      inst.payment = Math.round((principal + interest) * 100) / 100;
      inst.remainingBalance = Math.round(newBalance * 100) / 100;
      currentBalance = newBalance;
    }
  }

  const filtered = result.filter((inst, i) => {
    if (i === 0) return true;
    return (inst.payment ?? 0) > 0;
  });

  return {
    installments: filtered.map((inst, i) => ({
      ...inst,
      installmentNumber: i + 1,
    })),
    appliedTotal: Math.round(appliedTotal * 100) / 100,
  };
}
