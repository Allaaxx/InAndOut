import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import type { HourlyDistributionItemDTO } from '@shared/dtos';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface PeakHoursBarChartProps {
  data: HourlyDistributionItemDTO[];
}

export function PeakHoursBarChart({ data }: PeakHoursBarChartProps) {
  return (
    <Card className="shadow-xs" data-testid="peak-hours-bar-chart">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          Horários de Pico de Saídas
        </CardTitle>
        <CardDescription>
          Volume de saídas distribuído por faixas de horário escolar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 500, height: 250 }}
          >
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const item = payload[0]
                      .payload as HourlyDistributionItemDTO;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                        <p className="font-semibold text-slate-800">
                          {item.label}
                        </p>
                        <p className="text-indigo-600 font-medium">
                          {item.count} {item.count === 1 ? 'saída' : 'saídas'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
