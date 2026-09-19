import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { CreditChartEntry, CreditSummary } from '../../types/credit';
import { formatLei, formatPercent } from '../../lib/credit/numberParser';

type CreditChartProps = {
  data: CreditChartEntry[];
  summary: CreditSummary;
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

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;

  const data = payload[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <p className="text-sm font-medium text-slate-900">{data.name}</p>
      <p className="text-sm text-slate-600">{formatLei(data.value)}</p>
    </div>
  );
}

export function CreditChart({ data, summary }: CreditChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-slate-900">Structura costului creditului</h3>

      <div className="flex flex-col items-center gap-8 lg:flex-row">
        <div className="relative h-[280px] w-[280px] flex-shrink-0">
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
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-slate-500">Total plătit</span>
            <span className="text-sm font-bold text-slate-900">{formatLei(summary.totalPaid)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-4">
          {data.map(entry => (
            <div key={entry.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium text-slate-700">{entry.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900">{formatLei(entry.value)}</span>
                <span className="ml-2 text-sm text-slate-500">
                  {summary.totalPaid > 0
                    ? formatPercent((entry.value / summary.totalPaid) * 100)
                    : '0%'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
