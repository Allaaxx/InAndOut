import { Button } from '@client/components/ui/Button';
import type { UserDTO } from '@shared/dtos';
import {
  Activity,
  BarChart3,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  Menu,
  School,
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
        label: 'Monitoramento em Tempo Real',
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
        ariaLabel: 'Consulta por Aluno',
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
        title: 'Visão Geral da Escola',
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
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-200 z-20 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        data-testid="coordination-sidebar"
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <School className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <span className="text-sm font-bold tracking-tight text-slate-900 block truncate">
                  InAndOut
                </span>
                <span className="text-xs text-slate-500 block truncate">
                  Painel da Coordenação
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-hidden"
            data-testid="sidebar-collapse-toggle"
            aria-label={
              isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'
            }
            title={
              isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'
            }
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Sidebar Navigation Links */}
        <nav
          className="flex-1 space-y-1 p-3 overflow-y-auto"
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Info */}
        {!isCollapsed && (
          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">
                Escola Lins do Rego
              </p>
              <p>Módulo de Gestão Ativa</p>
            </div>
          </div>
        )}
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
                  <School className="h-6 w-6" />
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
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Contextual Header */}
        <header
          className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6 lg:px-8"
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

          {/* Right section: sound toggle, coordinator profile, logout */}
          <div className="flex items-center gap-3">
            {onToggleSound && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSound}
                className="flex items-center gap-2"
                title="Configurar Alerta Sonoro"
                aria-label="Alerta Sonoro"
              >
                {soundEnabled ? (
                  <>
                    <Bell className="h-4 w-4 text-emerald-600" />
                    <span className="hidden sm:inline">
                      Alerta Sonoro: Ativado
                    </span>
                    <span className="sm:hidden">Ativado</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 text-slate-400" />
                    <span className="hidden sm:inline">
                      Alerta Sonoro: Silenciado
                    </span>
                    <span className="sm:hidden">Mudo</span>
                  </>
                )}
              </Button>
            )}

            {/* Coordinator Info */}
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <div
                data-testid="coordinator-avatar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-2 ring-indigo-50"
                title={user.name}
              >
                {userInitials}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[140px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Coordenação
                </p>
              </div>
            </div>

            {/* Logout Button */}
            {onLogout && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
