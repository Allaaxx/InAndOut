import React, { useEffect, useState, useCallback } from 'react';
import { SchoolOverviewAnalyticsDTO, UserDTO } from '@shared/dtos';
import { api } from '@client/services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@client/components/ui/Card';
import { Button } from '@client/components/ui/Button';
import { PeakHoursBarChart } from '@client/components/charts/PeakHoursBarChart';
import { OutcomesPieChart } from '@client/components/charts/OutcomesPieChart';
import {
  Clock,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  School,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Filter,
} from 'lucide-react';

export interface AnalyticsDashboardPageProps {
  user: UserDTO;
  token: string;
  onLogout?: () => void;
  onNavigateBack?: () => void;
}

export function AnalyticsDashboardPage({
  user,
  token,
  onLogout,
  onNavigateBack,
}: AnalyticsDashboardPageProps) {
  const [data, setData] = useState<SchoolOverviewAnalyticsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedClassCode, setSelectedClassCode] = useState<string>('TODOS');
  const [selectedDate, setSelectedDate] = useState<string>('');

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
          : 'Erro ao carregar dados do dashboard analítico.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedClassCode, selectedDate, token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <School className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Dashboard Geral da Escola
              </h1>
              <p className="text-xs text-slate-500">
                Indicadores de Fluxo e Permanência — Escola Lins do Rego
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateBack}
                className="flex items-center gap-1.5 text-xs text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar ao Painel</span>
              </Button>
            )}

            {onLogout && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Carregando indicadores...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Tempo Médio Fora */}
              <Card className="shadow-xs border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Tempo Médio Fora de Sala
                  </CardTitle>
                  <Clock className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {data.stats.averageOutsideMinutes} min
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Média de duração por saída
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: Total de Saídas no Dia */}
              <Card className="shadow-xs border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total de Saídas no Dia
                  </CardTitle>
                  <LogOut className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {data.stats.totalExitsToday}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Volume diário registrado
                  </p>
                </CardContent>
              </Card>

              {/* Card 3: Taxa de Conformidade */}
              <Card className="shadow-xs border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Taxa de Conformidade
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {data.stats.complianceRate}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Saídas no tempo limite
                  </p>
                </CardContent>
              </Card>

              {/* Card 4: Ocorrências Ativas */}
              <Card className="shadow-xs border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Ocorrências Ativas
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {data.stats.activeIncidentsCount}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Estouros e escalonamentos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PeakHoursBarChart data={data.hourlyDistribution} />
              <OutcomesPieChart data={data.outcomeDistribution} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AnalyticsDashboardPage;
