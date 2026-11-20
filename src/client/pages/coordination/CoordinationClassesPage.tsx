import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/Dialog';
import { Input } from '@client/components/ui/Input';
import { Label } from '@client/components/ui/Label';
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
import type { ClassGroupDTO } from '@shared/dtos';
import { BookOpen, Pencil, Plus, Power, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

export interface CoordinationClassesPageProps {
  token: string;
}

function sortClassGroups(list: ClassGroupDTO[]): ClassGroupDTO[] {
  return [...list].sort((a, b) => {
    if (b.academicYear !== a.academicYear) {
      return b.academicYear - a.academicYear;
    }
    return a.code.localeCompare(b.code);
  });
}

export function CoordinationClassesPage({
  token,
}: CoordinationClassesPageProps) {
  const [classes, setClasses] = useState<ClassGroupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingClassId, setTogglingClassId] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createAcademicYear, setCreateAcademicYear] = useState(
    String(new Date().getFullYear()),
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingClass, setEditingClass] = useState<ClassGroupDTO | null>(null);
  const [editName, setEditName] = useState('');
  const [editAcademicYear, setEditAcademicYear] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.listClasses(token);
      setClasses(sortClassGroups(res.classes));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar o catálogo de turmas.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleOpenCreateDialog = () => {
    setCreateCode('');
    setCreateName('');
    setCreateAcademicYear(String(new Date().getFullYear()));
    setCreateError(null);
    setIsCreateDialogOpen(true);
  };

  const handleCreateClass = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedCode = createCode.trim();
    const trimmedName = createName.trim();
    const parsedYear = Number(createAcademicYear);

    if (!trimmedCode || !trimmedName || !Number.isInteger(parsedYear)) {
      setCreateError('Informe o código, o nome e um ano letivo válido.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const res = await api.createClass(
        {
          code: trimmedCode,
          name: trimmedName,
          academicYear: parsedYear,
        },
        token,
      );
      setClasses((prev) => sortClassGroups([...prev, res.classGroup]));
      setIsCreateDialogOpen(false);
      toast.success(
        `Turma ${res.classGroup.code} (${res.classGroup.academicYear}) cadastrada com sucesso.`,
      );
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Erro ao cadastrar turma.',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEditDialog = (item: ClassGroupDTO) => {
    setEditingClass(item);
    setEditName(item.name);
    setEditAcademicYear(String(item.academicYear));
    setEditError(null);
  };

  const handleUpdateClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingClass) return;

    const trimmedName = editName.trim();
    const parsedYear = Number(editAcademicYear);

    if (!trimmedName || !Number.isInteger(parsedYear)) {
      setEditError('Informe um nome e um ano letivo válidos.');
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);
      const res = await api.updateClass(
        editingClass.id,
        {
          name: trimmedName,
          academicYear: parsedYear,
        },
        token,
      );
      setClasses((prev) =>
        sortClassGroups(
          prev.map((item) =>
            item.id === editingClass.id ? res.classGroup : item,
          ),
        ),
      );
      setEditingClass(null);
      toast.success(
        `Turma ${res.classGroup.code} (${res.classGroup.academicYear}) atualizada com sucesso.`,
      );
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Erro ao atualizar turma.',
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (item: ClassGroupDTO) => {
    try {
      setTogglingClassId(item.id);
      setError(null);
      const res = await api.updateClassStatus(
        item.id,
        { isActive: !item.isActive },
        token,
      );
      setClasses((prev) =>
        prev.map((current) =>
          current.id === item.id ? res.classGroup : current,
        ),
      );
      toast.success(
        res.classGroup.isActive
          ? `Turma ${res.classGroup.code} (${res.classGroup.academicYear}) ativada com sucesso.`
          : `Turma ${res.classGroup.code} (${res.classGroup.academicYear}) desativada com sucesso.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar o status da turma.',
      );
    } finally {
      setTogglingClassId(null);
    }
  };

  const activeCount = classes.filter((item) => item.isActive).length;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Catálogo de Turmas
            </h2>
            <p className="text-sm text-slate-500">
              Cadastre e gerencie as turmas versionadas por ano letivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadClasses}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateDialog}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Turma</span>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <Card className="bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Turmas Cadastradas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {activeCount} de {classes.length} turmas ativas
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading && classes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Carregando turmas...
            </p>
          ) : classes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhuma turma cadastrada até o momento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome da Turma</TableHead>
                  <TableHead>Ano Letivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-semibold text-slate-900">
                      {item.code}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {item.name}
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      {item.academicYear}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'success' : 'secondary'}>
                        {item.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(item)}
                          className="inline-flex items-center gap-1.5"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={togglingClassId === item.id}
                          onClick={() => handleToggleStatus(item)}
                          className="inline-flex items-center gap-1.5"
                        >
                          <Power className="h-3.5 w-3.5" />
                          <span>{item.isActive ? 'Desativar' : 'Ativar'}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Turma</DialogTitle>
            <DialogDescription>
              Informe o código, o nome amigável e o ano letivo da turma.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-code-input">Código da Turma</Label>
              <Input
                id="class-code-input"
                placeholder="Ex.: 1A ou 2B"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-name-input">Nome da Turma</Label>
              <Input
                id="class-name-input"
                placeholder="Ex.: 1º Ano A"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-year-input">Ano Letivo</Label>
              <Input
                id="class-year-input"
                type="number"
                min={2000}
                max={2100}
                value={createAcademicYear}
                onChange={(e) => setCreateAcademicYear(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            {createError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {createError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Cadastrando...' : 'Cadastrar Turma'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingClass !== null}
        onOpenChange={(open) => {
          if (!open) setEditingClass(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Turma</DialogTitle>
            <DialogDescription>
              Atualize o nome amigável ou o ano letivo da turma selecionada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-class-code-input">Código da Turma</Label>
              <Input
                id="edit-class-code-input"
                value={editingClass?.code ?? ''}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-class-name-input">Nome da Turma</Label>
              <Input
                id="edit-class-name-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={savingEdit}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-class-year-input">Ano Letivo</Label>
              <Input
                id="edit-class-year-input"
                type="number"
                min={2000}
                max={2100}
                value={editAcademicYear}
                onChange={(e) => setEditAcademicYear(e.target.value)}
                disabled={savingEdit}
                required
              />
            </div>

            {editError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {editError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingClass(null)}
                disabled={savingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
