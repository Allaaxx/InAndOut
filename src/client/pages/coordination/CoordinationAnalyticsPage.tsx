import { OutcomesPieChart } from '@client/components/charts/OutcomesPieChart';
import { PeakHoursBarChart } from '@client/components/charts/PeakHoursBarChart';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { toast } from '@client/components/ui/Sonner';
import { api } from '@client/services/api';
import { buildReportFilename, downloadBlob } from '@client/services/download';
import type { SchoolOverviewAnalyticsDTO } from '@shared/dtos';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export interface CoordinationAnalyticsPageProps {
  token: string;
}

export function CoordinationAnalyticsPage({
  token,
}: CoordinationAnalyticsPageProps) {
  const [data, setData] = useState<SchoolOverviewAnalyticsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassCode, setSelectedClassCode] = useState<string>('TODOS');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: { classCode?: string; date?: string } = {};
      if (selectedClassCode && selectedClassCode !== 'TODOS') {
        params.classCode = selectedClassCode;
      }
      if (selectedDate) {
        params.date = selectedDate;
      }

      const res = await api.getOverviewAnalytics(params, token);
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar dados do dashboard analítico.',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedClassCode, selectedDate, token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    try {
      setExporting(true);
      const params = {
        format,
        classCode:
          selectedClassCode !== 'TODOS' ? selectedClassCode : undefined,
        startDate: selectedDate || undefined,
        endDate: selectedDate || undefined,
      };

      const blob = await api.exportAnalytics(params, token);
      const filename = buildReportFilename(format);
      downloadBlob(blob, filename);
      toast.success(
        `Relatório (${format.toUpperCase()}) exportado com sucesso.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Erro ao exportar relatório analítico.',
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Dashboard Geral da Escola
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Indicadores de Fluxo e Permanência — Escola Lins do Rego
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <label
              htmlFor="class-select"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Filtrar por Turma
            </label>
            <select
              id="class-select"
              aria-label="Filtrar por Turma"
              value={selectedClassCode}
              onChange={(e) => setSelectedClassCode(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="TODOS">Todas as Turmas</option>
              <option value="1A">Turma 1A</option>
              <option value="2B">Turma 2B</option>
              <option value="3C">Turma 3C</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <label
              htmlFor="date-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Data
            </label>
            <input
              id="date-input"
              aria-label="Data de Referência"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs text-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs text-slate-700"
          >
            <FileText className="h-4 w-4 text-rose-600" />
            <span>Exportar PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
            title="Atualizar dados analíticos"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xs">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tempo Médio Fora de Sala */}
        <Card className="border-l-4 border-l-indigo-600 shadow-xs transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tempo Médio Fora de Sala
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading
                ? '...'
                : `${
                    data?.stats?.averageOutsideMinutes ??
                    data?.stats?.averageAbsentMinutes ??
                    0
                  } min`}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Média por saída no período selecionado
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total de Saídas */}
        <Card className="border-l-4 border-l-blue-600 shadow-xs transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Saídas Realizadas Hoje
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : (data?.stats?.totalExitsToday ?? 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total de movimentações registradas
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Taxa de Conformidade */}
        <Card className="border-l-4 border-l-emerald-600 shadow-xs transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Taxa de Conformidade
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? '...' : `${data?.stats?.complianceRate ?? 0}%`}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Retornos dentro do limite de tempo
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Ocorrências Críticas Ativas */}
        <Card className="border-l-4 border-l-rose-600 shadow-xs transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ocorrências Críticas Ativas
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {loading
                ? '...'
                : (data?.stats?.activeIncidentsCount ??
                  data?.stats?.activeIncidents ??
                  0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Requerem intervenção imediata da Coordenação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Peak Hours Bar Chart */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Distribuição por Faixa Horária
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Concentração de saídas ao longo dos turnos escolares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PeakHoursBarChart
              data={data?.peakHours ?? data?.hourlyDistribution ?? []}
            />
          </CardContent>
        </Card>

        {/* Outcomes Pie Chart */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Composição dos Desfechos
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Proporção de retornos normais vs. ocorrências pedagógicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OutcomesPieChart
              data={
                data?.outcomesDistribution ?? data?.outcomeDistribution ?? []
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
