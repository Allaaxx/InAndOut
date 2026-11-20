import { UserMenuDropdown } from '@client/components/shared/UserMenuDropdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@client/components/ui/AlertDialog';
import { Checkbox } from '@client/components/ui/Checkbox';
import {
  DatePicker,
  DatePickerWithRange,
} from '@client/components/ui/DatePicker';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/components/ui/Dialog';
import { DropdownMenuItem } from '@client/components/ui/DropdownMenu';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@client/components/ui/InputOTP';
import { Label } from '@client/components/ui/Label';
import { ScrollArea } from '@client/components/ui/ScrollArea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/Select';
import { Separator } from '@client/components/ui/Separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@client/components/ui/Sheet';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/Table';
import { Textarea } from '@client/components/ui/Textarea';
import { UserRole } from '@shared/enums';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

function ControlledOTP({ mask = true }: { mask?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <InputOTP
        maxLength={4}
        value={value}
        onChange={setValue}
        ariaLabel="PIN de Verificação"
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} mask={mask} />
          <InputOTPSlot index={1} mask={mask} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={2} mask={mask} />
          <InputOTPSlot index={3} mask={mask} />
        </InputOTPGroup>
      </InputOTP>
      <span data-testid="otp-val">{value}</span>
    </div>
  );
}

function ControlledDatePicker({
  onChange,
}: {
  onChange: (date: Date | undefined) => void;
}) {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 10, 10));
  return (
    <div>
      <Label htmlFor="ref-date">Data de Referência</Label>
      <DatePicker
        id="ref-date"
        value={date}
        onChange={(next) => {
          setDate(next);
          onChange(next);
        }}
      />
    </div>
  );
}

describe('UI Primitives: Radix Dialog, AlertDialog & input-otp', () => {
  describe('InputOTP', () => {
    it('renders accessible input and updates value on user typing', async () => {
      const user = userEvent.setup();
      render(<ControlledOTP />);

      const input = screen.getByLabelText('PIN de Verificação');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('maxLength', '4');

      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();

      await user.type(input, '1234');

      expect(screen.getByTestId('otp-val')).toHaveTextContent('1234');
      const slots = screen.queryAllByText('•');
      expect(slots.length).toBe(4);
    });

    it('displays clear digits when mask={false}', async () => {
      const user = userEvent.setup();
      render(<ControlledOTP mask={false} />);

      const input = screen.getByLabelText('PIN de Verificação');
      await user.type(input, '5678');

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  describe('Dialog', () => {
    it('supports controlled and trigger-based opening, with accessible structure and close action', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Dialog onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <button type="button">Abrir Modal</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Título do Modal</DialogTitle>
              <DialogDescription>
                Descrição detalhada do modal.
              </DialogDescription>
            </DialogHeader>
            <p>Conteúdo do Diálogo</p>
            <DialogFooter>
              <DialogClose asChild>
                <button type="button">Fechar Diálogo</button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByText('Abrir Modal'));

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Título do Modal' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Descrição detalhada do modal.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Conteúdo do Diálogo')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Fechar Diálogo' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('AlertDialog', () => {
    it('renders accessible alertdialog role with Action and Cancel triggers', async () => {
      const user = userEvent.setup();
      const handleAction = vi.fn();
      const handleCancel = vi.fn();

      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button">Abrir Alerta</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmação Crítica</AlertDialogTitle>
              <AlertDialogDescription>
                Esta operação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>
                Cancelar Operação
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleAction}>
                Confirmar Ação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
      );

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      await user.click(screen.getByText('Abrir Alerta'));

      const alertdialog = await screen.findByRole('alertdialog');
      expect(alertdialog).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Confirmação Crítica' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Esta operação não pode ser desfeita.'),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Confirmar Ação' }));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sheet (Radix Dialog Drawer)', () => {
    it('supports controlled and trigger-based opening, with accessible structure and close action', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Sheet onOpenChange={onOpenChange}>
          <SheetTrigger asChild>
            <button type="button">Abrir Gaveta</button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Título da Gaveta</SheetTitle>
              <SheetDescription>
                Descrição detalhada da gaveta lateral.
              </SheetDescription>
            </SheetHeader>
            <p>Conteúdo da Gaveta</p>
            <SheetFooter>
              <SheetClose asChild>
                <button type="button">Fechar Gaveta</button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByText('Abrir Gaveta'));

      const sheet = await screen.findByRole('dialog');
      expect(sheet).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Título da Gaveta' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Descrição detalhada da gaveta lateral.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Conteúdo da Gaveta')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Fechar Gaveta' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('supports rendering on all sides (left, right, top, bottom)', async () => {
      const sides = ['left', 'right', 'top', 'bottom'] as const;

      for (const side of sides) {
        const { unmount } = render(
          <Sheet open={true}>
            <SheetContent side={side} data-testid={`sheet-${side}`}>
              <SheetHeader>
                <SheetTitle>Gaveta {side}</SheetTitle>
                <SheetDescription>Lado {side}</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>,
        );

        const sheet = screen.getByTestId(`sheet-${side}`);
        expect(sheet).toBeInTheDocument();
        if (side === 'left') {
          expect(sheet.className).toContain('inset-y-0 left-0');
        } else if (side === 'right') {
          expect(sheet.className).toContain('inset-y-0 right-0');
        } else if (side === 'top') {
          expect(sheet.className).toContain('inset-x-0 top-0');
        } else if (side === 'bottom') {
          expect(sheet.className).toContain('inset-x-0 bottom-0');
        }
        unmount();
      }
    });

    it('can be closed using the built-in close button', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Sheet open={true} onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Gaveta com Botão Fechar</SheetTitle>
              <SheetDescription>Testando fechar nativo</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      const closeButton = screen.getByRole('button', { name: 'Fechar' });
      expect(closeButton).toBeInTheDocument();
      await user.click(closeButton);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Select (Radix Select)', () => {
    it('renders select with options and handles selection changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <div>
          <Label htmlFor="turma-select">Turma</Label>
          <Select defaultValue="1A" onValueChange={handleChange}>
            <SelectTrigger id="turma-select" data-testid="turma-select">
              <SelectValue placeholder="Selecione a turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1A">Turma 1A</SelectItem>
              <SelectItem value="2B">Turma 2B</SelectItem>
              <SelectItem value="3C">Turma 3C</SelectItem>
            </SelectContent>
          </Select>
        </div>,
      );

      const trigger = screen.getByLabelText('Turma');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent('Turma 1A');

      await user.click(trigger);
      await user.click(await screen.findByRole('option', { name: 'Turma 2B' }));

      expect(trigger).toHaveTextContent('Turma 2B');
      expect(handleChange).toHaveBeenCalledWith('2B');
    });

    it('supports disabled state and custom classNames', () => {
      render(
        <Select disabled>
          <SelectTrigger
            className="border-red-500"
            data-testid="disabled-select"
          >
            <SelectValue placeholder="Opção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt">Opção</SelectItem>
          </SelectContent>
        </Select>,
      );

      const trigger = screen.getByTestId('disabled-select');
      expect(trigger).toBeDisabled();
      expect(trigger.className).toContain('border-red-500');
    });
  });

  describe('Textarea', () => {
    it('renders textarea, applies styles, and accepts user typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <div>
          <Label htmlFor="obs">Observações</Label>
          <Textarea
            id="obs"
            placeholder="Digite suas observações..."
            onChange={handleChange}
          />
        </div>,
      );

      const textarea = screen.getByLabelText('Observações');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute(
        'placeholder',
        'Digite suas observações...',
      );

      await user.type(textarea, 'Aluno liberado para enfermaria.');
      expect(textarea).toHaveValue('Aluno liberado para enfermaria.');
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Table', () => {
    it('renders table structure with header, body, rows, cells, and caption', () => {
      render(
        <Table data-testid="custom-table">
          <TableCaption>Lista de Turmas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Turma</TableHead>
              <TableHead>Alunos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>1A</TableCell>
              <TableCell>32</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell>32</TableCell>
            </TableRow>
          </TableFooter>
        </Table>,
      );

      expect(screen.getByTestId('custom-table')).toBeInTheDocument();
      expect(screen.getByText('Lista de Turmas')).toBeInTheDocument();
      expect(screen.getByText('Turma')).toBeInTheDocument();
      expect(screen.getByText('1A')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  describe('Checkbox & Separator', () => {
    it('renders checkbox and updates checked state on click', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <div>
          <Checkbox
            id="accept-terms"
            aria-label="Aceitar termos"
            onChange={handleChange}
          />
          <Label htmlFor="accept-terms">Termos</Label>
        </div>,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Aceitar termos' });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(handleChange).toHaveBeenCalled();
    });

    it('renders separator with horizontal and vertical orientations', () => {
      render(
        <div>
          <Separator data-testid="sep-h" />
          <Separator orientation="vertical" data-testid="sep-v" />
        </div>,
      );

      const sepH = screen.getByTestId('sep-h');
      const sepV = screen.getByTestId('sep-v');

      expect(sepH).toBeInTheDocument();
      expect(sepH.className).toContain('h-[1px] w-full');
      expect(sepV.className).toContain('h-full w-[1px]');
    });
  });

  describe('DatePicker (Popover + Calendar)', () => {
    it('opens calendar popover, allows selecting a date, and formats in pt-BR', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<ControlledDatePicker onChange={handleChange} />);

      const trigger = screen.getByLabelText('Data de Referência');
      expect(trigger).toHaveTextContent('10/11/2026');

      await user.click(trigger);

      const day15 = await screen.findByRole('button', { name: /15/ });
      await user.click(day15);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(trigger).toHaveTextContent('15/11/2026');
    });

    it('shows placeholder when no date is selected', () => {
      render(<DatePicker placeholder="Escolha uma data" />);
      expect(screen.getByText('Escolha uma data')).toBeInTheDocument();
    });

    it('renders DatePickerWithRange with formatted range in pt-BR', () => {
      render(
        <DatePickerWithRange
          value={{
            from: new Date(2026, 10, 10),
            to: new Date(2026, 10, 20),
          }}
        />,
      );
      expect(screen.getByText('10/11/2026 - 20/11/2026')).toBeInTheDocument();
    });
  });

  describe('ScrollArea (Radix ScrollArea)', () => {
    it('renders scrollable viewport with children and custom className', () => {
      render(
        <ScrollArea className="h-40" data-testid="custom-scroll-area">
          <div>Conteúdo rolável</div>
        </ScrollArea>,
      );

      const scrollArea = screen.getByTestId('custom-scroll-area');
      expect(scrollArea).toBeInTheDocument();
      expect(scrollArea.className).toContain('h-40');
      expect(screen.getByText('Conteúdo rolável')).toBeInTheDocument();
    });
  });

  describe('DropdownMenu & UserMenuDropdown', () => {
    it('opens user dropdown menu, renders custom items, and triggers logout', async () => {
      const user = userEvent.setup();
      const handleCustomAction = vi.fn();
      const handleLogout = vi.fn();

      render(
        <UserMenuDropdown
          user={{
            id: 'teacher-1',
            name: 'Prof. Carlos Eduardo',
            email: 'prof@linsdorego.edu.br',
            role: UserRole.TEACHER,
          }}
          triggerAriaLabel="Ações do Professor"
          onLogout={handleLogout}
          logoutLabel="Sair"
        >
          <DropdownMenuItem onSelect={handleCustomAction}>
            Bloquear Terminal
          </DropdownMenuItem>
        </UserMenuDropdown>,
      );

      const trigger = screen.getByRole('button', {
        name: /Ações do Professor/i,
      });
      await user.click(trigger);

      expect(
        await screen.findByText('prof@linsdorego.edu.br'),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole('menuitem', { name: /Bloquear Terminal/i }),
      );
      expect(handleCustomAction).toHaveBeenCalledTimes(1);

      await user.click(trigger);
      await user.click(await screen.findByRole('menuitem', { name: /Sair/i }));
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });
});
