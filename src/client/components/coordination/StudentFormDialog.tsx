import { Button } from '@client/components/ui/Button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/Select';
import type { ClassGroupDTO, StudentDTO } from '@shared/dtos';
import type React from 'react';
import { useMemo } from 'react';

export interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStudent: StudentDTO | null;
  classes: ClassGroupDTO[];
  activeClasses: ClassGroupDTO[];
  formRa: string;
  onFormRaChange: (value: string) => void;
  formFullName: string;
  onFormFullNameChange: (value: string) => void;
  formClassGroupId: string;
  onFormClassGroupIdChange: (value: string) => void;
  formHasSpecial: boolean;
  onFormHasSpecialChange: (checked: boolean) => void;
  formSpecialMinutes: string;
  onFormSpecialMinutesChange: (value: string) => void;
  savingStudent: boolean;
  formError: string | null;
  onSubmit: (event: React.FormEvent) => void;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  editingStudent,
  classes,
  activeClasses,
  formRa,
  onFormRaChange,
  formFullName,
  onFormFullNameChange,
  formClassGroupId,
  onFormClassGroupIdChange,
  formHasSpecial,
  onFormHasSpecialChange,
  formSpecialMinutes,
  onFormSpecialMinutesChange,
  savingStudent,
  formError,
  onSubmit,
}: StudentFormDialogProps) {
  const selectableClasses = useMemo(() => {
    if (!editingStudent) {
      return activeClasses;
    }

    const currentClass =
      classes.find((c) => c.id === editingStudent.classGroupId) ??
      classes.find((c) => c.code === editingStudent.classCode);

    if (
      currentClass &&
      !activeClasses.some((item) => item.id === currentClass.id)
    ) {
      return [currentClass, ...activeClasses];
    }

    return activeClasses;
  }, [editingStudent, classes, activeClasses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingStudent ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
          </DialogTitle>
          <DialogDescription>
            {editingStudent
              ? 'Atualize o nome, a turma ou o Tempo Especial do aluno. O RA é imutável.'
              : 'Informe o RA numérico, nome completo, turma ativa e eventual Tempo Especial.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-ra-input">RA</Label>
            <Input
              id="student-ra-input"
              placeholder="Ex.: 4001"
              value={formRa}
              onChange={(e) => onFormRaChange(e.target.value)}
              disabled={savingStudent || editingStudent !== null}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-name-input">Nome Completo</Label>
            <Input
              id="student-name-input"
              placeholder="Ex.: Mariana Souza"
              value={formFullName}
              onChange={(e) => onFormFullNameChange(e.target.value)}
              disabled={savingStudent}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-class-select">Turma</Label>
            <Select
              value={formClassGroupId}
              onValueChange={onFormClassGroupIdChange}
              disabled={savingStudent}
              required
            >
              <SelectTrigger id="student-class-select">
                <SelectValue placeholder="Selecione uma turma ativa" />
              </SelectTrigger>
              <SelectContent>
                {selectableClasses.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} — {item.name} ({item.academicYear})
                    {item.isActive ? '' : ' (Inativa)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={formHasSpecial}
                onChange={(e) => onFormHasSpecialChange(e.target.checked)}
                disabled={savingStudent}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Possui Tempo Especial</span>
            </label>

            {formHasSpecial && (
              <div className="space-y-1.5">
                <Label htmlFor="student-special-minutes-input">
                  Limite Especial (min)
                </Label>
                <Input
                  id="student-special-minutes-input"
                  type="number"
                  min={1}
                  max={120}
                  value={formSpecialMinutes}
                  onChange={(e) => onFormSpecialMinutesChange(e.target.value)}
                  disabled={savingStudent}
                  required
                />
              </div>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={savingStudent}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={savingStudent}>
              {savingStudent
                ? 'Salvando...'
                : editingStudent
                  ? 'Salvar Alterações'
                  : 'Cadastrar Aluno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
