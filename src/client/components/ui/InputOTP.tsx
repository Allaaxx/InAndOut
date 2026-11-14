import React from 'react';
import { cn } from './utils';

export interface InputOTPProps {
  maxLength?: number;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const InputOTPContext = React.createContext<{
  value: string;
  maxLength: number;
}>({
  value: '',
  maxLength: 4,
});

export function InputOTP({
  maxLength = 4,
  value,
  onChange,
  ariaLabel = 'Digite o PIN de 4 dígitos',
  id = 'pin-otp-input',
  disabled = false,
  className,
  children,
}: InputOTPProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, maxLength);
    onChange(digitsOnly);
  };

  return (
    <InputOTPContext.Provider value={{ value, maxLength }}>
      <div
        data-slot="input-otp"
        className={cn('relative flex flex-col items-center gap-2', className)}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={maxLength}
          aria-label={ariaLabel}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
        />
        {children ?? (
          <InputOTPGroup>
            {Array.from({ length: maxLength }).map((_, idx) => (
              <InputOTPSlot key={idx} index={idx} />
            ))}
          </InputOTPGroup>
        )}
      </div>
    </InputOTPContext.Provider>
  );
}

export function InputOTPGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function InputOTPSlot({
  index,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { index: number }) {
  const { value } = React.useContext(InputOTPContext);
  const char = value[index] ?? '';
  const isActive = value.length === index;

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white text-lg font-bold text-slate-900 shadow-xs transition-all',
        isActive && 'ring-2 ring-slate-950 border-slate-950',
        className
      )}
      {...props}
    >
      {char ? '•' : ''}
    </div>
  );
}
