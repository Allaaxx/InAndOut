import { UserMenuDropdown } from '@client/components/shared/UserMenuDropdown';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@client/components/ui/DropdownMenu';
import { ScrollArea } from '@client/components/ui/ScrollArea';
import type { UserDTO } from '@shared/dtos';
import {
  Activity,
  BarChart3,
  Bell,
  BellOff,
  GraduationCap,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  RefreshCwIcon,
  Settings,
  X,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface DashboardShellProps {
  user: UserDTO;
  onLogout?: () => void;
  onNavigateToAnalytics?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  ariaLabel: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function DashboardShell({
  user,
  onLogout,
  onNavigateToAnalytics,
  soundEnabled = true,
  onToggleSound,
  children,
}: DashboardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = useMemo(
    () => [
      {
        id: 'live',
        label: 'Tempo Real',
        ariaLabel: 'Monitoramento em Tempo Real',
        path: '/coordination/live',
        icon: Activity,
      },
      {
        id: 'analytics',
        label: 'Visão Geral',
        ariaLabel: 'Visão Geral - Dashboard Geral',
        path: '/coordination/analytics',
        icon: BarChart3,
      },
      {
        id: 'students',
        label: 'Consulta por Aluno',
        ariaLabel: 'Consultar Aluno',
        path: '/coordination/students',
        icon: GraduationCap,
      },
      {
        id: 'settings',
        label: 'Configurações',
        ariaLabel: 'Configurações',
        path: '/coordination/settings',
        icon: Settings,
      },
    ],
    [],
  );

  const currentPath = location.pathname;

  const isNavActive = (item: NavItem) => {
    if (item.id === 'live') {
      return (
        currentPath === '/coordination' ||
        currentPath === '/coordination/live' ||
        currentPath === '/' ||
        currentPath === '/live'
      );
    }
    return (
      currentPath === item.path ||
      currentPath.startsWith(`${item.path}/`) ||
      currentPath === `/${item.id}`
    );
  };

  const currentSection = useMemo(() => {
    if (
      currentPath === '/coordination/analytics' ||
      currentPath === '/analytics'
    ) {
      return {
        title: 'Visão Geral',
        subtitle:
          'Métricas consolidadas de horários de pico e desfechos de saídas',
      };
    }
    if (
      currentPath === '/coordination/students' ||
      currentPath === '/students'
    ) {
      return {
        title: 'Consulta por Aluno',
        subtitle:
          'Histórico individual de movimentações, assiduidade e exportação de relatórios',
      };
    }
    if (
      currentPath === '/coordination/settings' ||
      currentPath === '/settings'
    ) {
      return {
        title: 'Configurações da Coordenação',
        subtitle:
          'Preferências locais de alertas sonoros e recarregamento de dados',
      };
    }
    return {
      title: 'Monitoramento em Tempo Real',
      subtitle: 'Monitoramento de saídas em tempo real de toda a escola',
    };
  }, [currentPath]);

  const handleNavigate = (path: string) => {
    if (path === '/coordination/analytics' && onNavigateToAnalytics) {
      onNavigateToAnalytics();
    }
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-300 ease-in-out z-20 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
        data-testid="coordination-sidebar"
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-16 items-center border-b border-slate-200 px-3">
          <div
            aria-hidden={isCollapsed}
            className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-200 ${
              isCollapsed ? 'w-0 opacity-0' : 'flex-1 pl-1 opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                data-testid="sidebar-school-icon"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs"
              >
                <RefreshCwIcon className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-slate-900 block">
                  InAndOut
                </span>
                <span className="text-xs text-slate-500 block">
                  Painel da Coordenação
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-hidden"
            data-testid="sidebar-collapse-toggle"
            aria-label={
              isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'
            }
            title={
              isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'
            }
          >
            {isCollapsed ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Sidebar Navigation Links */}
        <nav
          className="flex-1 space-y-1 p-2 overflow-y-auto overflow-x-hidden"
          aria-label="Navegação da Coordenação"
        >
          {navItems.map((item) => {
            const active = isNavActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.path)}
                data-testid={`sidebar-nav-${item.id}`}
                aria-label={item.ariaLabel}
                aria-current={active ? 'page' : undefined}
                title={item.label}
                className={`flex w-full items-center gap-3 overflow-hidden rounded-lg py-3 pl-4 pr-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-indigo-600' : 'text-slate-600'
                  }`}
                />
                <span
                  aria-hidden={isCollapsed}
                  className={`truncate whitespace-nowrap transition-opacity duration-200 ${
                    isCollapsed ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Info */}
        <div
          aria-hidden={isCollapsed}
          className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
            isCollapsed
              ? 'max-h-0 border-t-0 p-0 opacity-0'
              : 'max-h-24 border-t border-slate-200 p-4 opacity-100'
          }`}
        >
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Escola Lins do Rego</p>
            <p>Módulo de Gestão Ativa</p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity cursor-default w-full h-full border-0 p-0"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                  <RefreshCwIcon className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-bold tracking-tight text-slate-900 block">
                    InAndOut
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Painel da Coordenação
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fechar menu lateral"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const active = isNavActive(item);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    data-testid={`mobile-nav-${item.id}`}
                    aria-label={item.ariaLabel}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        active ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        {/* Top Contextual Header */}
        <header
          className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6 lg:px-8"
          data-testid="coordination-header"
        >
          {/* Left section: mobile hamburger & title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                {currentSection.title}
              </h1>
              <p className="hidden sm:block text-xs text-slate-500">
                {currentSection.subtitle}
              </p>
            </div>
          </div>

          {/* Right section: reusable profile dropdown menu */}
          <UserMenuDropdown
            user={user}
            roleLabel="Coordenação"
            triggerAriaLabel="Menu do Usuário"
            triggerTestId="coordinator-profile-dropdown-trigger"
            avatarTestId="coordinator-avatar"
            contentTestId="coordinator-profile-dropdown"
            onLogout={onLogout}
            logoutLabel="Sair"
          >
            <DropdownMenuGroup>
              {onToggleSound && (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onToggleSound();
                  }}
                  title="Configurar Alerta Sonoro"
                  aria-label="Alerta Sonoro"
                  className="justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Bell className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <BellOff className="h-4 w-4 text-slate-400" />
                    )}
                    <span>Alerta Sonoro</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      soundEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {soundEnabled ? 'Ativado' : 'Silenciado'}
                  </span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onSelect={() => handleNavigate('/coordination/settings')}
                className="text-xs"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Configurações</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </UserMenuDropdown>
        </header>

        {/* Page Content Body */}
        <ScrollArea className="flex-1 min-h-0">
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </ScrollArea>
      </div>
    </div>
  );
}
