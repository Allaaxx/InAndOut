import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import type { OutcomeDistributionItemDTO } from '@shared/dtos';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface OutcomesPieChartProps {
  data: OutcomeDistributionItemDTO[];
}

const OUTCOME_COLORS: Record<string, string> = {
  RETURNED_NORMAL: '#10b981', // Emerald
  RETURNED_TO_CLASS: '#10b981',
  SENT_TO_INFIRMARY: '#f59e0b', // Amber
  ATTENDED_AT_COORDINATION: '#6366f1', // Indigo
  HANDLED_AT_COORDINATION: '#6366f1',
  EVASION: '#f43f5e', // Rose
};

export function OutcomesPieChart({ data }: OutcomesPieChartProps) {
  const chartData = data.filter((item) => item.count > 0);
  const totalCount = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card className="shadow-xs" data-testid="outcomes-pie-chart">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          Desfechos de Ocorrência
        </CardTitle>
        <CardDescription>
          Distribuição proporcional de retornos e resoluções pedagógicas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-60 w-full md:w-1/2">
            {totalCount > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 300, height: 240 }}
              >
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.outcome}
                        fill={OUTCOME_COLORS[entry.outcome] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const item = payload[0]
                          .payload as OutcomeDistributionItemDTO;
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                            <p className="font-semibold text-slate-800">
                              {item.label}
                            </p>
                            <p className="text-slate-600">
                              {item.count}{' '}
                              {item.count === 1 ? 'registro' : 'registros'} (
                              {item.percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Nenhum dado registrado
              </div>
            )}
          </div>

          <div className="w-full md:w-1/2 space-y-3">
            {data.map((item) => {
              const color = OUTCOME_COLORS[item.outcome] || '#94a3b8';
              return (
                <div
                  key={item.outcome}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-slate-700">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                    <span className="font-semibold text-slate-800">
                      {item.count}
                    </span>
                    <span>({item.percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
