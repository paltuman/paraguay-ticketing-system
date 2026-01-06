import { useState, useEffect } from 'react';
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
  X,
} from 'lucide-react';
import logo from '@/assets/logo-pai.png';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('admin' | 'support_user' | 'supervisor')[];
  tourId?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    tourId: 'sidebar-dashboard',
  },
  {
    label: 'Mis Tickets',
    href: '/tickets',
    icon: Ticket,
    tourId: 'sidebar-tickets',
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cerrar sidebar automáticamente en móvil cuando se navega
  useEffect(() => {
    if (isMobile && isOpen) {
      onToggle();
    }
  }, [location.pathname]);

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => {
      if (role === 'admin') return isAdmin;
      if (role === 'supervisor') return isSupervisor;
      if (role === 'support_user') return isSupportUser || isAdmin;
      return false;
    });
  });

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link to="/dashboard" className="flex items-center gap-3 group flex-1">
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
        {/* Close button for mobile */}
        {isMobile && isOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
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
              data-tour={item.tourId}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                !isOpen && !isMobile && 'justify-center px-2'
              )}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-sidebar-primary/20 blur-md" />
              )}
              <Icon className={cn('relative h-5 w-5 flex-shrink-0 transition-transform duration-200', 
                isActive ? 'scale-110' : 'group-hover:scale-110'
              )} />
              {(isOpen || isMobile) && <span className="relative truncate">{item.label}</span>}
              
              {/* Tooltip for collapsed state (desktop only) */}
              {!isOpen && !isMobile && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground rounded-lg text-xs font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button (desktop only) */}
      {!isMobile && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-card text-foreground shadow-lg transition-all duration-200 hover:bg-accent hover:scale-110 z-10"
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      )}

      <div className="border-t border-sidebar-border p-4">
        {isOpen || isMobile ? (
          <div className="text-center animate-fade-in">
            <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">v2.0.0</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" title="Sistema activo" />
          </div>
        )}
      </div>
    </>
  );

  // Mobile: Full overlay sidebar
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onToggle}
          />
        )}
        
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col bg-sidebar transition-transform duration-300 ease-in-out lg:hidden',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: Standard sidebar
  return (
    <aside
      className={cn(
        'relative hidden lg:flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
