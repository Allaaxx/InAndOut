import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/Dialog';
import { Label } from '@client/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/Select';
import { api } from '@client/services/api';
import type { ClassGroupDTO } from '@shared/dtos';
import type React from 'react';
import { useEffect, useState } from 'react';

const DURATION_OPTIONS = [45, 50, 60, 90, 100];
const SUBJECT_OPTIONS = [
  'Matemática',
  'Português',
  'História',
  'Física',
  'Química',
  'Biologia',
  'Geografia',
  'Inglês',
];

export interface StartSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  token: string;
  loading: boolean;
  error: string | null;
  onStartSession: (payload: {
    classGroupId: string;
    classCode: string;
    subject: string;
    plannedDurationMinutes: number;
  }) => Promise<void>;
}

export function StartSessionModal({
  open,
  onOpenChange,
  roomId,
  token,
  loading,
  error,
  onStartSession,
}: StartSessionModalProps) {
  const [classes, setClasses] = useState<ClassGroupDTO[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('Matemática');
  const [plannedDurationMinutes, setPlannedDurationMinutes] =
    useState<number>(50);

  useEffect(() => {
    if (!open || typeof api.listClasses !== 'function') {
      return;
    }

    let cancelled = false;
    setLoadingClasses(true);
    setClassesError(null);

    api
      .listClasses(token, { onlyActive: true })
      .then((res) => {
        if (cancelled) return;
        const activeClasses = res.classes ?? [];
        setClasses(activeClasses);
        setSelectedClassGroupId((prev) => {
          if (prev && activeClasses.some((item) => item.id === prev)) {
            return prev;
          }
          return activeClasses[0]?.id ?? '';
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setClasses([]);
        setSelectedClassGroupId('');
        setClassesError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar turmas ativas.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingClasses(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const selectedClassGroup = classes.find(
    (item) => item.id === selectedClassGroupId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassGroup) {
      return;
    }
    await onStartSession({
      classGroupId: selectedClassGroup.id,
      classCode: selectedClassGroup.code,
      subject: selectedSubject,
      plannedDurationMinutes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Iniciar Nova Sessão de Aula</DialogTitle>
            <Badge variant="secondary">{roomId}</Badge>
          </div>
          <DialogDescription>
            Selecione a Turma e a Disciplina para liberar o registro de saídas
            no terminal da sala <strong>{roomId}</strong> (duração sugerida: 50
            minutos).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <Label
              htmlFor="session-class-select"
              className="text-sm font-medium text-slate-700"
            >
              Turma
            </Label>
            <Select
              value={selectedClassGroupId}
              onValueChange={setSelectedClassGroupId}
              disabled={loadingClasses || classes.length === 0}
            >
              <SelectTrigger id="session-class-select">
                <SelectValue
                  placeholder={
                    loadingClasses
                      ? 'Carregando turmas ativas...'
                      : classes.length === 0
                        ? 'Nenhuma turma ativa disponível'
                        : 'Selecione a turma'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.code} — {cls.name} ({cls.academicYear})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingClasses && !classesError && classes.length === 0 && (
              <p className="text-xs text-amber-700">
                Nenhuma turma ativa cadastrada. Solicite à Coordenação a
                ativação ou cadastro de turmas.
              </p>
            )}
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label
              htmlFor="session-subject-select"
              className="text-sm font-medium text-slate-700"
            >
              Disciplina
            </Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="session-subject-select">
                <SelectValue placeholder="Selecione a disciplina" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_OPTIONS.map((subj) => (
                  <SelectItem key={subj} value={subj}>
                    {subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label
              htmlFor="session-duration-select"
              className="text-sm font-medium text-slate-700"
            >
              Duração (min)
            </Label>
            <Select
              value={String(plannedDurationMinutes)}
              onValueChange={(value) =>
                setPlannedDurationMinutes(Number(value))
              }
            >
              <SelectTrigger id="session-duration-select">
                <SelectValue placeholder="Selecione a duração" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(classesError || error) && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {classesError || error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingClasses || !selectedClassGroup}
            >
              Iniciar Sessão de Aula
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
