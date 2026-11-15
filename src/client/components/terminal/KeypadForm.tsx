import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { Input } from '@client/components/ui/Input';
import { useKeypadInput } from '@client/hooks/useKeypadInput';
import type React from 'react';

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export interface KeypadFormProps {
  loading?: boolean;
  error?: string | null;
  onSubmitRa: (ra: string) => Promise<void>;
  onReturnRa?: (ra: string) => Promise<void>;
  queueFeedback?: {
    ra: string;
    position: number;
    message: string;
  } | null;
  onCancelQueue?: (ra: string) => Promise<void> | void;
}

export function KeypadForm({
  loading = false,
  error = null,
  onSubmitRa,
  onReturnRa,
  queueFeedback = null,
  onCancelQueue,
}: KeypadFormProps) {
  const { value, setValue, appendDigit, backspace, clear, canSubmit } =
    useKeypadInput({ maxLength: 12 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    try {
      await onSubmitRa(value);
      clear();
    } catch {
      // Keep error displayed in parent state
    }
  };

  const handleReturnClick = async () => {
    if (!canSubmit || loading || !onReturnRa) return;
    try {
      await onReturnRa(value);
      clear();
    } catch {
      // Keep error displayed in parent state
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Saída e Retorno por RA</CardTitle>
        <CardDescription>
          Digite seu RA no teclado numérico virtual para solicitar saída ao
          banheiro ou registrar seu retorno à sala.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="student-ra-input"
              className="text-sm font-medium text-slate-700"
            >
              RA do Estudante
            </label>
            <Input
              id="student-ra-input"
              type="text"
              inputMode="numeric"
              placeholder="Digite seu RA (ex: 1001)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={loading}
              className="text-center font-mono text-lg tracking-widest"
            />
          </div>

          <fieldset
            aria-label="Teclado numérico virtual"
            className="grid grid-cols-3 gap-2"
          >
            {KEYPAD_DIGITS.map((digit) => (
              <Button
                key={digit}
                type="button"
                variant="outline"
                size="lg"
                onClick={() => appendDigit(digit)}
                disabled={loading}
                className="text-lg font-semibold"
              >
                {digit}
              </Button>
            ))}

            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={clear}
              disabled={loading || value.length === 0}
            >
              Limpar
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => appendDigit('0')}
              disabled={loading}
              className="text-lg font-semibold"
            >
              0
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={backspace}
              disabled={loading || value.length === 0}
            >
              Apagar
            </Button>
          </fieldset>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!canSubmit || loading}
            >
              Registrar Saída
            </Button>

            {onReturnRa && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                onClick={handleReturnClick}
                disabled={!canSubmit || loading}
              >
                Registrar Retorno
              </Button>
            )}
          </div>

          {queueFeedback && (
            <div
              role="status"
              aria-live="polite"
              data-testid="queue-position-feedback"
              className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {queueFeedback.message}
                </p>
                <p className="text-xs text-blue-700">
                  Digite seu RA novamente ou clique em Desistir para cancelar.
                </p>
              </div>
              {onCancelQueue && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 font-medium self-start sm:self-auto"
                  onClick={() => onCancelQueue(queueFeedback.ra)}
                  disabled={loading}
                  data-testid="numpad-cancel-queue-button"
                >
                  Desistir da Fila
                </Button>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
