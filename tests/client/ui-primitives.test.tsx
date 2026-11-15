import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@client/components/ui/InputOTP';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@client/components/ui/Dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@client/components/ui/AlertDialog';

describe('UI Primitives: Radix Dialog, AlertDialog & input-otp', () => {
  describe('InputOTP', () => {
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
            <button>Abrir Modal</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Título do Modal</DialogTitle>
              <DialogDescription>Descrição detalhada do modal.</DialogDescription>
            </DialogHeader>
            <p>Conteúdo do Diálogo</p>
            <DialogFooter>
              <DialogClose asChild>
                <button>Fechar Diálogo</button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByText('Abrir Modal'));

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Título do Modal' })).toBeInTheDocument();
      expect(screen.getByText('Descrição detalhada do modal.')).toBeInTheDocument();
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
            <button>Abrir Alerta</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmação Crítica</AlertDialogTitle>
              <AlertDialogDescription>Esta operação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>Cancelar Operação</AlertDialogCancel>
              <AlertDialogAction onClick={handleAction}>Confirmar Ação</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      await user.click(screen.getByText('Abrir Alerta'));

      const alertdialog = await screen.findByRole('alertdialog');
      expect(alertdialog).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Confirmação Crítica' })).toBeInTheDocument();
      expect(screen.getByText('Esta operação não pode ser desfeita.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Confirmar Ação' }));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });
});
