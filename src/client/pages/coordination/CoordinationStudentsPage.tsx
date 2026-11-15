import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { type ColumnDef, DataTable } from '@client/components/ui/DataTable';
import { Input } from '@client/components/ui/Input';
import { toast } from '@client/components/ui/Sonner';
import { api } from '@client/services/api';
import { downloadBlob } from '@client/services/download';
import type { MovementDTO, StudentHistoryReportDTO } from '@shared/dtos';
import { MovementStatus } from '@shared/enums';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  LogOut,
  Search,
  User,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export interface CoordinationStudentsPageProps {
  token: string;
}

export function CoordinationStudentsPage({
  token,
}: CoordinationStudentsPageProps) {
  const [searchRa, setSearchRa] = useState<string>('');
  const [studentStartDate, setStudentStartDate] = useState<string>('');
  const [studentEndDate, setStudentEndDate] = useState<string>('');
  const [studentReport, setStudentReport] =
    useState<StudentHistoryReportDTO | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
        token,
      );
      setStudentReport(report);
    } catch (err) {
      setStudentReport(null);
      setStudentError(
        err instanceof Error
          ? err.message
          : 'Erro ao consultar histórico do aluno.',
      );
    } finally {
      setStudentLoading(false);
    }
  };

  const handleExport = async (
    format: 'xlsx' | 'pdf' | 'csv',
    targetRa?: string,
  ) => {
    try {
      setExporting(true);
      const params = {
        format,
        ra: targetRa || (studentReport ? studentReport.student.ra : undefined),
        startDate: studentStartDate || undefined,
        endDate: studentEndDate || undefined,
      };

      const blob = await api.exportAnalytics(params, token);
      const extension =
        format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
      downloadBlob(blob, `relatorio-movimentacoes.${extension}`);
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
    <div className="space-y-6">
      {/* Search Filter Card */}
      <Card className="shadow-xs bg-white">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">
            Consultar Histórico por Aluno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSearchStudent}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="search-ra-input"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                RA do Aluno
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="search-ra-input"
                  placeholder="Digite o RA do aluno (ex: 1001)..."
                  value={searchRa}
                  onChange={(e) => setSearchRa(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="student-start-date"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Data Início
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="student-start-date"
                  aria-label="Data Início"
                  type="date"
                  value={studentStartDate}
                  onChange={(e) => setStudentStartDate(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white pl-9 pr-3 py-1 text-sm font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="student-end-date"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Data Fim
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="student-end-date"
                  aria-label="Data Fim"
                  type="date"
                  value={studentEndDate}
                  onChange={(e) => setStudentEndDate(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white pl-9 pr-3 py-1 text-sm font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={studentLoading || !searchRa.trim()}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span>{studentLoading ? 'Buscando...' : 'Buscar'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {studentError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xs">
          {studentError}
        </div>
      )}

      {/* Student Report Results */}
      {studentReport && (
        <div className="space-y-6">
          {/* Student Profile Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {studentReport.student.fullName || studentReport.student.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>
                    RA: <strong>{studentReport.student.ra}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Turma: <strong>{studentReport.student.classCode}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('xlsx', studentReport.student.ra)}
                disabled={exporting}
                className="flex items-center gap-1.5 text-xs text-slate-700"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Exportar Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf', studentReport.student.ra)}
                disabled={exporting}
                className="flex items-center gap-1.5 text-xs text-slate-700"
              >
                <FileText className="h-4 w-4 text-rose-600" />
                <span>Exportar PDF</span>
              </Button>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-indigo-600 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total de Saídas
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <LogOut className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {studentReport.summary.totalExits ??
                    studentReport.summary.totalDepartures ??
                    0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Total de liberações autorizadas
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-600 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tempo Fora de Sala
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {studentReport.summary.totalAbsentMinutes ??
                    studentReport.summary.totalMinutesOutside ??
                    0}{' '}
                  min
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tempo acumulado fora de sala
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Média por Saída
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {studentReport.summary.averageDurationMinutes ??
                    studentReport.summary.averageDurationPerExit ??
                    0}{' '}
                  min
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Duração média das saídas
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-600 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Presença Efetiva
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {studentReport.summary.attendancePercentage ??
                    studentReport.summary.effectiveAttendancePercentage ??
                    0}
                  %
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Taxa de permanência em aula
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Movement History Table */}
          <Card className="shadow-xs bg-white overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">
                Histórico de Movimentações do Aluno
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <DataTable
                columns={movementColumns}
                data={studentReport.history}
                rowKey={(item) => item.id}
                emptyMessage="Nenhuma movimentação registrada para este aluno no período."
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
