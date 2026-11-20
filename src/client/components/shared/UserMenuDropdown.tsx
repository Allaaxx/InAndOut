import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@client/components/ui/DropdownMenu';
import { cn } from '@client/components/ui/utils';
import type { UserDTO } from '@shared/dtos';
import { UserRole } from '@shared/enums';
import { LogOut, MoreVertical } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.TEACHER]: 'Docente',
  [UserRole.COORDINATOR]: 'Coordenação',
  [UserRole.ADMIN]: 'Administração',
};

function extractUserInitials(name?: string): string {
  if (!name) return 'US';
  const withoutTitle = name.replace(
    /^(Coord\.|Prof\.|Dr\.|Dra\.|Sr\.|Sra\.)\s+/i,
    '',
  );
  const parts = withoutTitle.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface UserMenuDropdownProps {
  user: UserDTO;
  roleLabel?: string;
  triggerAriaLabel?: string;
  triggerTestId?: string;
  avatarTestId?: string;
  contentTestId?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  onLogout?: () => void;
  logoutLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export function UserMenuDropdown({
  user,
  roleLabel,
  triggerAriaLabel = 'Menu do Usuário',
  triggerTestId,
  avatarTestId,
  contentTestId,
  align = 'end',
  side = 'bottom',
  onLogout,
  logoutLabel = 'Sair',
  className,
  children,
}: UserMenuDropdownProps) {
  const initials = useMemo(() => extractUserInitials(user.name), [user.name]);
  const subtitle = roleLabel ?? ROLE_LABELS[user.role] ?? user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid={triggerTestId}
          aria-label={triggerAriaLabel}
          className={cn(
            'flex items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 data-[state=open]:bg-slate-100',
            className,
          )}
        >
          <div
            data-testid={avatarTestId}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200/70"
            title={user.name}
          >
            {initials}
          </div>
          <div className="hidden sm:grid flex-1 text-left text-xs leading-tight max-w-[150px]">
            <span className="truncate font-semibold text-slate-900">
              {user.name}
            </span>
            <span className="truncate text-[11px] text-slate-500">
              {subtitle}
            </span>
          </div>
          <MoreVertical className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        data-testid={contentTestId}
        align={align}
        side={side}
        className="w-64"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-2 py-2 text-left">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
              {initials}
            </div>
            <div className="grid flex-1 text-left leading-tight min-w-0">
              <span className="truncate text-sm font-semibold text-slate-900">
                {user.name}
              </span>
              <span className="truncate text-xs text-slate-500">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        {children && (
          <>
            <DropdownMenuSeparator />
            {children}
          </>
        )}

        {onLogout && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onLogout()}
              aria-label={logoutLabel}
              className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{logoutLabel}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
