import React, { useEffect, useState, useCallback } from 'react';
import {
  MovementDTO,
  SchoolOverviewAnalyticsDTO,
  StudentHistoryReportDTO,
  UserDTO,
} from '@shared/dtos';
import { api } from '@client/services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@client/components/ui/Card';
import { Button } from '@client/components/ui/Button';
import { Input } from '@client/components/ui/Input';
import { Badge } from '@client/components/ui/Badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@client/components/ui/Tabs';
import { ColumnDef, DataTable } from '@client/components/ui/DataTable';
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
  Search,
  FileSpreadsheet,
  FileText,
  User,
  GraduationCap,
} from 'lucide-react';
import { MovementStatus } from '@shared/enums';

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
  // Overview state
  const [data, setData] = useState<SchoolOverviewAnalyticsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassCode, setSelectedClassCode] = useState<string>('TODOS');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Student history state
  const [searchRa, setSearchRa] = useState<string>('');
  const [studentStartDate, setStudentStartDate] = useState<string>('');
  const [studentEndDate, setStudentEndDate] = useState<string>('');
  const [studentReport, setStudentReport] =
    useState<StudentHistoryReportDTO | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Export state
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
          : 'Erro ao carregar dados do dashboard analítico.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedClassCode, selectedDate, token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleSearchStudent = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmedRa = searchRa.trim();
    if (!trimmedRa) return;

    try {
      setStudentLoading(true);
      setStudentError(null);
      const report = await api.getStudentHistory(
        trimmedRa,
        {
          startDate: studentStartDate || undefined,
          endDate: studentEndDate || undefined,
        },
        token
      );
      setStudentReport(report);
    } catch (err) {
      setStudentReport(null);
      setStudentError(
        err instanceof Error
          ? err.message
          : 'Erro ao consultar histórico do aluno.'
      );
    } finally {
      setStudentLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf', targetRa?: string) => {
    try {
      setExporting(true);
      const params = {
        format,
        ra: targetRa || (studentReport ? studentReport.student.ra : undefined),
        classCode:
          !targetRa && selectedClassCode !== 'TODOS'
            ? selectedClassCode
            : undefined,
        startDate: studentStartDate || undefined,
        endDate: studentEndDate || undefined,
      };

      const blob = await api.exportAnalytics(params, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${format === 'csv' ? 'movimentacoes.csv' : 'movimentacoes.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Erro ao exportar relatório analítico.'
      );
    } finally {
      setExporting(false);
    }
  };

  const movementColumns: ColumnDef<MovementDTO>[] = [
    {
      key: 'startedAt',
      header: 'Data / Hora',
      render: (m) => new Date(m.startedAt).toLocaleString('pt-BR'),
    },
    {
      key: 'subject',
      header: 'Disciplina',
    },
    {
      key: 'durationMinutes',
      header: 'Duração',
      render: (m) =>
        m.durationMinutes !== undefined ? `${m.durationMinutes} min` : '-',
    },
    {
      key: 'allowedLimitMinutes',
      header: 'Limite',
      render: (m) => `${m.allowedLimitMinutes} min`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => {
        let variant:
          | 'default'
          | 'secondary'
          | 'destructive'
          | 'outline'
          | 'success'
          | 'warning' = 'secondary';
        if (m.status === MovementStatus.RETURNED_NORMAL) variant = 'success';
        else if (
          m.status === MovementStatus.OVERDUE ||
          m.status === MovementStatus.ESCALATED_TO_COORDINATION
        )
          variant = 'destructive';
        else if (m.status === MovementStatus.IN_TRANSIT) variant = 'warning';

        return <Badge variant={variant}>{m.status}</Badge>;
      },
    },
    {
      key: 'outcome',
      header: 'Desfecho',
      render: (m) => m.outcome ?? '-',
    },
    {
      key: 'attendancePercentage',
      header: '% Presença',
      render: (m) =>
        m.attendancePercentage !== undefined
          ? `${m.attendancePercentage}%`
          : '-',
    },
  ];

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

      {/* Main Content with Shadcn Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="student">Consulta por Aluno</TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: VISÃO GERAL */}
          <TabsContent value="overview" className="space-y-6">
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
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-700"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Exportar CSV</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-700"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-600" />
                  <span>Exportar PDF</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-slate-700"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                  />
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
          </TabsContent>

          {/* TAB 2: CONSULTA POR ALUNO */}
          <TabsContent value="student" className="space-y-6">
            {/* Search Form and Filter Bar */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <form
                onSubmit={handleSearchStudent}
                className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4"
              >
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <label
                      htmlFor="ra-search"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-600"
                    >
                      Buscar Histórico por RA
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="ra-search"
                        placeholder="Digite o RA do aluno (ex: 1001)"
                        value={searchRa}
                        onChange={(e) => setSearchRa(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="w-full sm:w-40 space-y-1.5">
                    <label
                      htmlFor="student-start-date"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-600"
                    >
                      Data Inicial
                    </label>
                    <input
                      id="student-start-date"
                      aria-label="Data Inicial"
                      type="date"
                      value={studentStartDate}
                      onChange={(e) => setStudentStartDate(e.target.value)}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="w-full sm:w-40 space-y-1.5">
                    <label
                      htmlFor="student-end-date"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-600"
                    >
                      Data Final
                    </label>
                    <input
                      id="student-end-date"
                      aria-label="Data Final"
                      type="date"
                      value={studentEndDate}
                      onChange={(e) => setStudentEndDate(e.target.value)}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={studentLoading || !searchRa.trim()}
                    className="flex items-center gap-1.5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Search
                      className={`h-4 w-4 ${studentLoading ? 'animate-spin' : ''}`}
                    />
                    <span>Buscar</span>
                  </Button>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2 justify-end pt-2 md:pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleExport('csv', studentReport?.student.ra)
                    }
                    disabled={exporting || !studentReport}
                    className="flex items-center gap-1.5 text-xs text-slate-700"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Exportar CSV</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleExport('pdf', studentReport?.student.ra)
                    }
                    disabled={exporting || !studentReport}
                    className="flex items-center gap-1.5 text-xs text-slate-700"
                  >
                    <FileText className="h-3.5 w-3.5 text-rose-600" />
                    <span>Exportar PDF</span>
                  </Button>
                </div>
              </form>
            </div>

            {/* Error Message */}
            {studentError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{studentError}</span>
              </div>
            )}

            {/* Loading Indicator */}
            {studentLoading && (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">Buscando histórico do aluno...</p>
              </div>
            )}

            {/* Student Report Display */}
            {studentReport && !studentLoading && (
              <div className="space-y-6">
                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                  {/* Card 1: Nome do Aluno */}
                  <Card className="shadow-xs border-slate-200 lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        Aluno
                      </CardTitle>
                      <User className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-slate-900 truncate">
                        {studentReport.student.fullName}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        RA: {studentReport.student.ra}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 2: Turma */}
                  <Card className="shadow-xs border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        Turma
                      </CardTitle>
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-slate-900">
                        {studentReport.student.classCode}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Classe regular</p>
                    </CardContent>
                  </Card>

                  {/* Card 3: Total de Saídas */}
                  <Card className="shadow-xs border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        Total de Saídas
                      </CardTitle>
                      <LogOut className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {studentReport.summary.totalExits}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">No período</p>
                    </CardContent>
                  </Card>

                  {/* Card 4: Minutos Fora */}
                  <Card className="shadow-xs border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        Minutos Fora
                      </CardTitle>
                      <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">
                        {studentReport.summary.totalAbsentMinutes} min
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Tempo ausente</p>
                    </CardContent>
                  </Card>

                  {/* Card 5: Duração Média */}
                  <Card className="shadow-xs border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        Duração Média
                      </CardTitle>
                      <Clock className="h-4 w-4 text-cyan-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {studentReport.summary.averageDurationMinutes} min
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Por saída</p>
                    </CardContent>
                  </Card>

                  {/* Card 6: % Presença Efetiva */}
                  <Card className="shadow-xs border-slate-200 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        % Presença
                      </CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">
                        {studentReport.summary.attendancePercentage}%
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Tempo em sala</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Movements DataTable */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-800">
                      Histórico Detalhado de Saídas
                    </h3>
                    <span className="text-xs text-slate-500">
                      Total: {studentReport.history.length} movimentações
                    </span>
                  </div>

                  <DataTable<MovementDTO>
                    columns={movementColumns}
                    data={studentReport.history}
                    rowKey={(m) => m.id}
                    emptyMessage="Nenhuma saída registrada para este aluno no período selecionado."
                  />
                </div>
              </div>
            )}

            {/* Empty prompt when no student is queried */}
            {!studentReport && !studentLoading && !studentError && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <h4 className="text-sm font-medium text-slate-700">
                  Consulta Individual de Histórico
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Digite o RA do aluno para pesquisar seu histórico completo de
                  saídas, duração acumulada e percentual de presença efetiva.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default AnalyticsDashboardPage;
