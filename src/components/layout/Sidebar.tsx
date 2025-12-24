import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Ticket,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Shield,
} from 'lucide-react';
import logo from '@/assets/logo-pai.png';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('admin' | 'support_user' | 'supervisor')[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Mis Tickets',
    href: '/tickets',
    icon: Ticket,
  },
  {
    label: 'Crear Ticket',
    href: '/tickets/new',
    icon: PlusCircle,
    roles: ['support_user', 'admin'],
  },
  {
    label: 'Estadísticas',
    href: '/statistics',
    icon: BarChart3,
    roles: ['supervisor', 'admin'],
  },
  {
    label: 'Usuarios',
    href: '/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'Auditoría',
    href: '/audit-logs',
    icon: Shield,
    roles: ['admin'],
  },
  {
    label: 'Configuración',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const { roles, isAdmin, isSupervisor, isSupportUser } = useAuth();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => {
      if (role === 'admin') return isAdmin;
      if (role === 'supervisor') return isSupervisor;
      if (role === 'support_user') return isSupportUser || isAdmin;
      return false;
    });
  });

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Logo"
            className={cn('h-10 w-10 rounded-full bg-white p-0.5 transition-all', isOpen ? '' : 'h-12 w-12')}
          />
          {isOpen && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Sistema de Tickets</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                !isOpen && 'justify-center px-2'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'animate-pulse-soft')} />
              {isOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent"
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        {isOpen && (
          <p className="text-center text-xs text-sidebar-foreground/50">
            Subsistema de Información
          </p>
        )}
      </div>
    </aside>
  );
}
