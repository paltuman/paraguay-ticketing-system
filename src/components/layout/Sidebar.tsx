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
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-4">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <img
              src={logo}
              alt="Logo"
              className={cn(
                'rounded-full bg-white p-0.5 transition-all duration-300 ring-2 ring-sidebar-primary/20 group-hover:ring-sidebar-primary/50', 
                isOpen ? 'h-10 w-10' : 'h-11 w-11'
              )}
            />
            <div className="absolute inset-0 rounded-full bg-sidebar-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {isOpen && (
            <div className="flex flex-col animate-fade-in">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">Sistema de Tickets</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto scrollbar-thin">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                !isOpen && 'justify-center px-2'
              )}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-sidebar-primary/20 blur-md" />
              )}
              <Icon className={cn('relative h-5 w-5 flex-shrink-0 transition-transform duration-200', 
                isActive ? 'scale-110' : 'group-hover:scale-110'
              )} />
              {isOpen && <span className="relative truncate">{item.label}</span>}
              
              {/* Tooltip for collapsed state */}
              {!isOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground rounded-lg text-xs font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-card text-foreground shadow-lg transition-all duration-200 hover:bg-accent hover:scale-110 z-10"
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <div className="border-t border-sidebar-border p-4">
        {isOpen ? (
          <div className="text-center animate-fade-in">
            <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">v2.0.0</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" title="Sistema activo" />
          </div>
        )}
      </div>
    </aside>
  );
}
