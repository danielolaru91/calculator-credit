
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { CreditChartEntry, CreditSummary } from '../../types/credit';
import { formatLei, formatPercent } from '../../lib/credit/numberParser';

type CreditChartProps = {
  data: CreditChartEntry[];
  summary: CreditSummary;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  endDate?: string;
  remainingPeriod?: string;
  reducedPeriod?: string;
};

const RADIAN = Math.PI / 180;

function CustomLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);

  if (percent < 0.05) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export function CreditChart({
  data,
  summary,
  title = 'Structura costului creditului',
  subtitle,
  compact = false,
  endDate,
  remainingPeriod,
  reducedPeriod,
}: CreditChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>

      <div
        className={
          compact
            ? 'flex flex-col items-center gap-6'
            : 'flex flex-col items-center gap-8 lg:flex-row'
        }
      >
        <div
          className={
            compact
              ? 'relative h-[240px] w-[240px] flex-shrink-0'
              : 'relative h-[280px] w-[280px] flex-shrink-0'
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={CustomLabel}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-slate-500">Total plătit</span>
            <span className="text-sm font-bold text-slate-900">
              {formatLei(summary.totalPaid)}
            </span>
          </div>
        </div>

        <div className={compact ? 'w-full space-y-3' : 'flex-1 space-y-4'}>
          {data.map(entry => (
            <div
              key={entry.name}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium text-slate-700">
                  {entry.name}
                </span>
              </div>

              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900">
                  {formatLei(entry.value)}
                </span>
                <span className="ml-2 text-sm text-slate-500">
                  {summary.totalPaid > 0
                    ? formatPercent(
                        (entry.value / summary.totalPaid) * 100
                      )
                    : '0%'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

{(endDate || remainingPeriod || reducedPeriod) && (
  <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
    {endDate && (
      <div>
        <p className="text-xs text-slate-500">
          Data terminării creditului
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {endDate}
        </p>
      </div>
    )}

    {remainingPeriod && (
      <div>
        <p className="text-xs text-slate-500">
          Perioadă rămasă de astăzi
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {remainingPeriod}
        </p>
      </div>
    )}

    {reducedPeriod && (
      <div>
        <p className="text-xs text-slate-500">
          Perioadă redusă
        </p>
        <p className="mt-1 text-sm font-semibold text-green-700">
          {reducedPeriod}
        </p>
      </div>
    )}
  </div>
)}
    </div>
  );
}
