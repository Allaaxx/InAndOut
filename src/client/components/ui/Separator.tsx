import React from 'react';
import { cn } from './utils';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref,
  ) => {
    const classes = cn(
      'shrink-0 bg-slate-200',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className,
    );

    if (decorative) {
      return <div ref={ref} role="none" className={classes} {...props} />;
    }

    return (
      <hr
        ref={ref as React.Ref<HTMLHRElement>}
        aria-orientation={orientation}
        className={cn('border-0', classes)}
        {...props}
      />
    );
  },
);
Separator.displayName = 'Separator';
