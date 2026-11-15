import { Button } from '@client/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/Dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@client/components/ui/InputOTP';
import type React from 'react';
import { useState } from 'react';

export interface PinLockModalProps {
  open: boolean;
  teacherName: string;
  onUnlock: (pin: string) => Promise<void>;
  onLogout?: () => void;
}

export function PinLockModal({
  open,
  teacherName,
  onUnlock,
  onLogout,
}: PinLockModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length !== 4) {
      setError('Digite os 4 dígitos numéricos do seu PIN.');
      return;
    }

    setLoading(true);
    try {
      await onUnlock(pin);
      setPin('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN incorreto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terminal Bloqueado</DialogTitle>
          <DialogDescription>
            Sessão de {teacherName}. Insira seu PIN de 4 dígitos para liberar a
            sala rapidamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center py-2">
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={(val) => {
                setPin(val);
                if (error) setError(null);
              }}
              ariaLabel="Digite o PIN de 4 dígitos"
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <p
              role="alert"
              className="text-center text-sm font-medium text-red-600"
            >
              {error}
            </p>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {onLogout && (
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                disabled={loading}
              >
                Trocar Professor
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Desbloquear Sala'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
