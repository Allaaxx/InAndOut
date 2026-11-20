import { StudentFormDialog } from '@client/components/coordination/StudentFormDialog';
import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { type ColumnDef, DataTable } from '@client/components/ui/DataTable';
import {
  DatePickerWithRange,
  type DateRange,
  formatIsoDate,
} from '@client/components/ui/DatePicker';
import { Input } from '@client/components/ui/Input';
import { Label } from '@client/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/Select';
import { toast } from '@client/components/ui/Sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/Table';
import { api } from '@client/services/api';
import { buildReportFilename, downloadBlob } from '@client/services/download';
import type {
  ClassGroupDTO,
  MovementDTO,
  StudentDTO,
  StudentHistoryReportDTO,
} from '@shared/dtos';
import {
  getIncidentOutcomeLabel,
  getMovementStatusLabel,
  MovementStatus,
} from '@shared/enums';
import { formatDateTimeInAppTimezone } from '@shared/timezone';
import {
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  History,
  LogOut,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface CoordinationStudentsPageProps {
  token: string;
}

function sortStudents(list: StudentDTO[]): StudentDTO[] {
  return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function CoordinationStudentsPage({
  token,
}: CoordinationStudentsPageProps) {
  // Catalog state
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [classes, setClasses] = useState<ClassGroupDTO[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [togglingStudentId, setTogglingStudentId] = useState<string | null>(
    null,
  );

  // Catalog filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');

  // Create / Edit Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentDTO | null>(null);
  const [formRa, setFormRa] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formClassGroupId, setFormClassGroupId] = useState('');
  const [formHasSpecial, setFormHasSpecial] = useState(false);
  const [formSpecialMinutes, setFormSpecialMinutes] = useState('15');
  const [savingStudent, setSavingStudent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // History Report state
  const [searchRa, setSearchRa] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [studentReport, setStudentReport] =
    useState<StudentHistoryReportDTO | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadCatalog = useCallback(async () => {
    const canListStudents = typeof api.listStudents === 'function';
    const canListClasses = typeof api.listClasses === 'function';
    if (!canListStudents && !canListClasses) return;

    try {
      setCatalogLoading(true);
      setCatalogError(null);
      const [studentsRes, classesRes] = await Promise.all([
        canListStudents
          ? api.listStudents(token)
          : Promise.resolve({ students: [] as StudentDTO[] }),
        canListClasses
          ? api.listClasses(token)
          : Promise.resolve({ classes: [] as ClassGroupDTO[] }),
      ]);
      setStudents(sortStudents(studentsRes?.students ?? []));
      setClasses(classesRes?.classes ?? []);
    } catch (err) {
      setCatalogError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar o catálogo de alunos.',
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const activeClasses = useMemo(
    () => classes.filter((item) => item.isActive),
    [classes],
  );

  const filteredStudents = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    return students.filter((student) => {
      if (term) {
        const matchesName = student.fullName.toLowerCase().includes(term);
        const matchesRa = student.ra.toLowerCase().includes(term);
        if (!matchesName && !matchesRa) return false;
      }

      if (classFilter !== 'ALL') {
        const matchesGroupId = student.classGroupId === classFilter;
        const selectedClass = classes.find((c) => c.id === classFilter);
        const matchesCode =
          selectedClass !== undefined &&
          student.classCode === selectedClass.code;
        if (!matchesGroupId && !matchesCode) return false;
      }

      if (statusFilter === 'ACTIVE' && !student.isActive) return false;
      if (statusFilter === 'INACTIVE' && student.isActive) return false;

      return true;
    });
  }, [students, catalogSearch, classFilter, statusFilter, classes]);

  const activeStudentsCount = useMemo(
    () => students.filter((s) => s.isActive).length,
    [students],
  );

  const handleOpenCreateDialog = () => {
    setEditingStudent(null);
    setFormRa('');
    setFormFullName('');
    setFormClassGroupId(activeClasses[0]?.id ?? '');
    setFormHasSpecial(false);
    setFormSpecialMinutes('15');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (student: StudentDTO) => {
    const resolvedMinutes =
      student.specialLimitMinutes ?? student.specialTimeLimitMinutes;
    setEditingStudent(student);
    setFormRa(student.ra);
    setFormFullName(student.fullName);
    setFormClassGroupId(
      student.classGroupId ??
        classes.find((c) => c.code === student.classCode)?.id ??
        activeClasses[0]?.id ??
        '',
    );
    setFormHasSpecial(Boolean(student.hasSpecialCondition || resolvedMinutes));
    setFormSpecialMinutes(resolvedMinutes ? String(resolvedMinutes) : '15');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleSubmitStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedFullName = formFullName.trim();
    const trimmedRa = formRa.trim();

    if (!editingStudent && !trimmedRa) {
      setFormError('Informe o RA numérico do aluno.');
      return;
    }

    if (!trimmedFullName) {
      setFormError('Informe o nome completo do aluno.');
      return;
    }

    if (!formClassGroupId) {
      setFormError('Selecione uma turma ativa para o aluno.');
      return;
    }

    let parsedSpecialMinutes: number | null = null;
    if (formHasSpecial) {
      const parsed = Number(formSpecialMinutes);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setFormError(
          'O Tempo Especial deve ser um número inteiro positivo de minutos.',
        );
        return;
      }
      parsedSpecialMinutes = parsed;
    }

    try {
      setSavingStudent(true);
      setFormError(null);

      if (editingStudent) {
        const res = await api.updateStudent(
          editingStudent.id,
          {
            fullName: trimmedFullName,
            classGroupId: formClassGroupId,
            hasSpecialCondition: formHasSpecial,
            specialLimitMinutes: formHasSpecial ? parsedSpecialMinutes : null,
          },
          token,
        );
        setStudents((prev) =>
          sortStudents(
            prev.map((item) =>
              item.id === editingStudent.id ? res.student : item,
            ),
          ),
        );
        setIsDialogOpen(false);
        toast.success(
          `Aluno ${res.student.fullName} (RA ${res.student.ra}) atualizado com sucesso.`,
        );
      } else {
        const res = await api.createStudent(
          {
            ra: trimmedRa,
            fullName: trimmedFullName,
            classGroupId: formClassGroupId,
            hasSpecialCondition: formHasSpecial,
            ...(formHasSpecial && parsedSpecialMinutes !== null
              ? { specialLimitMinutes: parsedSpecialMinutes }
              : {}),
          },
          token,
        );
        setStudents((prev) => sortStudents([...prev, res.student]));
        setIsDialogOpen(false);
        toast.success(
          `Aluno ${res.student.fullName} (RA ${res.student.ra}) cadastrado com sucesso.`,
        );
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Erro ao salvar dados do aluno.',
      );
    } finally {
      setSavingStudent(false);
    }
  };

  const handleToggleStatus = async (student: StudentDTO) => {
    try {
      setTogglingStudentId(student.id);
      setCatalogError(null);
      const res = await api.updateStudentStatus(
        student.id,
        { isActive: !student.isActive },
        token,
      );
      setStudents((prev) =>
        prev.map((item) => (item.id === student.id ? res.student : item)),
      );
      toast.success(
        res.student.isActive
          ? `Aluno ${res.student.fullName} ativado com sucesso.`
          : `Aluno ${res.student.fullName} desativado com sucesso.`,
      );
    } catch (err) {
      setCatalogError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar o status do aluno.',
      );
    } finally {
      setTogglingStudentId(null);
    }
  };

  const fetchStudentHistory = async (targetRa: string) => {
    const trimmedRa = targetRa.trim();
    if (!trimmedRa) return;

    try {
      setStudentLoading(true);
      setStudentError(null);
      const report = await api.getStudentHistory(
        trimmedRa,
        {
          startDate: formatIsoDate(dateRange?.from) || undefined,
          endDate: formatIsoDate(dateRange?.to) || undefined,
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

  const handleSearchStudent = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    await fetchStudentHistory(searchRa);
  };

  const handleViewStudentHistory = async (student: StudentDTO) => {
    setSearchRa(student.ra);
    await fetchStudentHistory(student.ra);
  };

  const handleExport = async (
    format: 'xlsx' | 'pdf' | 'csv',
    targetRa?: string,
  ) => {
    try {
      setExporting(true);
      const studentRa =
        targetRa || (studentReport ? studentReport.student.ra : undefined);
      const params = {
        format,
        ra: studentRa,
        startDate: formatIsoDate(dateRange?.from) || undefined,
        endDate: formatIsoDate(dateRange?.to) || undefined,
      };

      const blob = await api.exportAnalytics(params, token);
      const filename = buildReportFilename(format, studentRa);
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

  const movementColumns: ColumnDef<MovementDTO>[] = [
    {
      key: 'startedAt',
      header: 'Data / Hora',
      render: (m) => formatDateTimeInAppTimezone(m.startedAt),
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

        return (
          <Badge variant={variant}>{getMovementStatusLabel(m.status)}</Badge>
        );
      },
    },
    {
      key: 'outcome',
      header: 'Desfecho',
      render: (m) => getIncidentOutcomeLabel(m.outcome),
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
    <div className="w-full space-y-6">
      {/* Catalog Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Catálogo de Alunos
            </h2>
            <p className="text-sm text-slate-500">
              Cadastre, transfira de turma, configure Tempo Especial e consulte
              o histórico de movimentações
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadCatalog}
            disabled={catalogLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${catalogLoading ? 'animate-spin' : ''}`}
            />
            <span>Atualizar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateDialog}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Aluno</span>
          </Button>
        </div>
      </div>

      {catalogError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {catalogError}
        </div>
      )}

      {/* Catalog Filters & Table */}
      <Card className="bg-white shadow-xs">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Alunos Cadastrados
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {activeStudentsCount} de {students.length} alunos ativos
              </CardDescription>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Buscar aluno por nome ou RA"
                placeholder="Buscar por nome ou RA..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger aria-label="Filtrar por Turma">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as turmas</SelectItem>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code} — {item.name} ({item.academicYear})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                }
              >
                <SelectTrigger aria-label="Filtrar por Status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="INACTIVE">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {catalogLoading && students.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Carregando alunos...
            </p>
          ) : filteredStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhum aluno encontrado com os filtros aplicados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RA</TableHead>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Tempo Especial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const specialMinutes =
                    student.specialLimitMinutes ??
                    student.specialTimeLimitMinutes;
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono font-semibold text-slate-900">
                        {student.ra}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {student.fullName}
                      </TableCell>
                      <TableCell className="font-mono text-slate-700">
                        {student.classCode}
                      </TableCell>
                      <TableCell>
                        {student.hasSpecialCondition && specialMinutes ? (
                          <Badge variant="warning">{specialMinutes} min</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Padrão</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={student.isActive ? 'success' : 'secondary'}
                        >
                          {student.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewStudentHistory(student)}
                            className="inline-flex items-center gap-1.5"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>Histórico</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(student)}
                            className="inline-flex items-center gap-1.5"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={togglingStudentId === student.id}
                            onClick={() => handleToggleStatus(student)}
                            className="inline-flex items-center gap-1.5"
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span>
                              {student.isActive ? 'Desativar' : 'Ativar'}
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Search Filter Card for Movement History Report */}
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
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="student-date-range"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Período
                </Label>
                {dateRange?.from && (
                  <button
                    type="button"
                    onClick={() => setDateRange(undefined)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <DatePickerWithRange
                id="student-date-range"
                aria-label="Período"
                value={dateRange}
                onChange={setDateRange}
                placeholder="Selecionar período"
                align="end"
                className="h-10 w-full sm:w-[260px] font-medium text-slate-700"
              />
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

      {/* Create / Edit Student Dialog */}
      <StudentFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingStudent={editingStudent}
        classes={classes}
        activeClasses={activeClasses}
        formRa={formRa}
        onFormRaChange={setFormRa}
        formFullName={formFullName}
        onFormFullNameChange={setFormFullName}
        formClassGroupId={formClassGroupId}
        onFormClassGroupIdChange={setFormClassGroupId}
        formHasSpecial={formHasSpecial}
        onFormHasSpecialChange={setFormHasSpecial}
        formSpecialMinutes={formSpecialMinutes}
        onFormSpecialMinutesChange={setFormSpecialMinutes}
        savingStudent={savingStudent}
        formError={formError}
        onSubmit={handleSubmitStudent}
      />
    </div>
  );
}
