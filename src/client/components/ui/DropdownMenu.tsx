import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import * as React from 'react';
import { cn } from './utils';

export const DropdownMenu = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;
export const DropdownMenuGroup = RadixDropdown.Group;
export const DropdownMenuPortal = RadixDropdown.Portal;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof RadixDropdown.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Content>
>(({ className, sideOffset = 6, collisionPadding = 12, ...props }, ref) => (
  <DropdownMenuPortal>
    <RadixDropdown.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(
        'z-50 min-w-[15rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-lg outline-none',
        className,
      )}
      {...props}
    />
  </DropdownMenuPortal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof RadixDropdown.Label>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Label>
>(({ className, ...props }, ref) => (
  <RadixDropdown.Label
    ref={ref}
    className={cn(
      'px-2.5 py-1.5 text-xs font-semibold text-slate-700',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof RadixDropdown.Item>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Item>
>(({ className, ...props }, ref) => (
  <RadixDropdown.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof RadixDropdown.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Separator>
>(({ className, ...props }, ref) => (
  <RadixDropdown.Separator
    ref={ref}
    className={cn('-mx-1 my-1.5 h-px bg-slate-100', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';
