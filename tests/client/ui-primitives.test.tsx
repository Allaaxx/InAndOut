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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@client/components/ui/InputOTP';
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
});
