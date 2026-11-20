import { ScrollArea } from '@client/components/ui/ScrollArea';
import type { UserDTO } from '@shared/dtos';
import {
  Activity,
  BarChart3,
  Bell,
  BellOff,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  RefreshCwIcon,
  Settings,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click or Escape
  useEffect(() => {
    if (!isProfileOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

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

  const userInitials = useMemo(() => {
    if (!user.name) return 'CO';
    const cleaned = user.name.replace(
      /^(Coord\.|Prof\.|Dr\.|Dra\.|Sr\.|Sra\.)\s+/i,
      '',
    );
    const parts = cleaned.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user.name]);

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

          {/* Right section: profile dropdown menu grouping user info, sound toggle and logout */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              data-testid="coordinator-profile-dropdown-trigger"
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
              aria-label="Menu do Usuário"
              className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100 transition-colors focus:outline-hidden"
            >
              <div
                data-testid="coordinator-avatar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-2 ring-indigo-50"
                title={user.name}
              >
                {userInitials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[140px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Coordenação
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div
                data-testid="coordinator-profile-dropdown"
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 text-slate-900 animate-in fade-in-0 zoom-in-95"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user.email}
                  </p>
                </div>

                <div className="py-1">
                  {onToggleSound && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onToggleSound();
                      }}
                      className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Configurar Alerta Sonoro"
                      aria-label="Alerta Sonoro"
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
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleNavigate('/coordination/settings');
                      setIsProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Configurações</span>
                  </button>
                </div>

                {onLogout && (
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                      aria-label="Sair"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <ScrollArea className="flex-1 min-h-0">
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </ScrollArea>
      </div>
    </div>
  );
}
