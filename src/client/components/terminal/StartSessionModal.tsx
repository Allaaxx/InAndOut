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
import type React from 'react';
import { useState } from 'react';

const CLASS_OPTIONS = ['1A', '1B', '2A', '2B', '3A', '3B'];
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
  loading: boolean;
  error: string | null;
  onStartSession: (payload: {
    classCode: string;
    subject: string;
  }) => Promise<void>;
}

export function StartSessionModal({
  open,
  onOpenChange,
  roomId,
  loading,
  error,
  onStartSession,
}: StartSessionModalProps) {
  const [selectedClassCode, setSelectedClassCode] = useState<string>('1A');
  const [selectedSubject, setSelectedSubject] = useState<string>('Matemática');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onStartSession({
      classCode: selectedClassCode,
      subject: selectedSubject,
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
              value={selectedClassCode}
              onValueChange={setSelectedClassCode}
            >
              <SelectTrigger id="session-class-select">
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
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
            <Button type="submit" disabled={loading}>
              Iniciar Sessão de Aula
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
