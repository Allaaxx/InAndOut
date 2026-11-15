import { OTPInput, OTPInputContext } from 'input-otp';
import * as React from 'react';
import { cn } from './utils';

type OTPInputBaseProps = React.ComponentPropsWithoutRef<typeof OTPInput>;

export interface InputOTPProps
  extends Omit<OTPInputBaseProps, 'children' | 'render'> {
  ariaLabel?: string;
  children?: React.ReactNode;
}

export const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  InputOTPProps
>(
  (
    {
      className,
      containerClassName,
      ariaLabel = 'Digite o PIN de 4 dígitos',
      id = 'pin-otp-input',
      maxLength = 4,
      pushPasswordManagerStrategy = 'none',
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <OTPInput
        ref={ref}
        id={id}
        maxLength={maxLength}
        pushPasswordManagerStrategy={pushPasswordManagerStrategy}
        containerClassName={cn(
          'relative flex flex-col items-center gap-2 has-[:disabled]:opacity-50',
          containerClassName,
        )}
        className={cn('disabled:cursor-not-allowed', className)}
        aria-label={ariaLabel ?? props['aria-label']}
        data-slot="input-otp"
        {...props}
      >
        {children ?? (
          <InputOTPGroup>
            {Array.from({ length: maxLength }).map((_, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed slots count
              <InputOTPSlot key={`slot-${idx}`} index={idx} />
            ))}
          </InputOTPGroup>
        )}
      </OTPInput>
    );
  },
);
InputOTP.displayName = 'InputOTP';

export const InputOTPGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="input-otp-group"
    className={cn('flex items-center gap-2', className)}
    {...props}
  />
));
InputOTPGroup.displayName = 'InputOTPGroup';

export interface InputOTPSlotProps
  extends React.HTMLAttributes<HTMLDivElement> {
  index: number;
  mask?: boolean;
}

export const InputOTPSlot = React.forwardRef<HTMLDivElement, InputOTPSlotProps>(
  ({ index, className, mask = true, ...props }, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const slot = inputOTPContext?.slots?.[index];
    const char = slot?.char ?? '';
    const isActive = slot?.isActive;
    const hasFakeCaret = slot?.hasFakeCaret;

    return (
      <div
        ref={ref}
        data-slot="input-otp-slot"
        data-active={isActive}
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white text-lg font-bold text-slate-900 shadow-xs transition-all',
          isActive && 'ring-2 ring-slate-950 border-slate-950',
          className,
        )}
        {...props}
      >
        {mask ? (char ? '•' : '') : char}
        {hasFakeCaret && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-px animate-caret-blink bg-slate-950 duration-1000" />
          </div>
        )}
      </div>
    );
  },
);
InputOTPSlot.displayName = 'InputOTPSlot';

export const InputOTPSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  // biome-ignore lint/a11y/useSemanticElements: Radix/Shadcn UI standard inline separator
  <div
    ref={ref}
    role="separator"
    data-slot="input-otp-separator"
    className={cn('text-slate-400', className)}
    {...props}
  >
    -
  </div>
));
InputOTPSeparator.displayName = 'InputOTPSeparator';

export { OTPInputContext };
