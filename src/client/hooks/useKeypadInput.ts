import { useCallback, useState } from 'react';

export interface UseKeypadInputOptions {
  maxLength?: number;
  initialValue?: string;
}

export function useKeypadInput({
  maxLength = 12,
  initialValue = '',
}: UseKeypadInputOptions = {}) {
  const [value, setRawValue] = useState<string>(
    initialValue.replace(/\D/g, '').slice(0, maxLength),
  );

  const setValue = useCallback(
    (next: string) => {
      const sanitized = (next ?? '').replace(/\D/g, '').slice(0, maxLength);
      setRawValue(sanitized);
    },
    [maxLength],
  );

  const appendDigit = useCallback(
    (digit: string) => {
      const cleanDigit = (digit ?? '').replace(/\D/g, '');
      if (!cleanDigit) return;
      setRawValue((prev) => {
        if (prev.length >= maxLength) return prev;
        return (prev + cleanDigit).slice(0, maxLength);
      });
    },
    [maxLength],
  );

  const backspace = useCallback(() => {
    setRawValue((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setRawValue('');
  }, []);

  return {
    value,
    setValue,
    appendDigit,
    pressDigit: appendDigit,
    backspace,
    removeLast: backspace,
    clear,
    canSubmit: value.trim().length > 0,
  };
}
