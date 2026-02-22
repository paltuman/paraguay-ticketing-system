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
import logo from '@/assets/logo-pai-circular.png';
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle mobile sidebar animation
  useEffect(() => {
    if (isMobile) {
      if (isOpen) {
        setShowMobileSidebar(true);
        setIsAnimating(true);
      } else if (showMobileSidebar) {
        setIsAnimating(true);
        const timer = setTimeout(() => {
          setShowMobileSidebar(false);
          setIsAnimating(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, isMobile]);

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
        <Link to="/dashboard" className="flex items-center gap-3 group flex-1 min-w-0">
          <div className={cn(
            'relative flex-shrink-0 transition-all duration-300 ease-out',
            !isOpen && !isMobile && 'mx-auto'
          )}>
            <img
              src={logo}
              alt="PAI"
              className={cn(
                'rounded-full bg-white ring-2 ring-sidebar-primary/20 group-hover:ring-sidebar-primary/50',
                'transition-all duration-300 ease-out object-contain',
                isOpen || isMobile ? 'h-10 w-10 p-0.5' : 'h-12 w-12 p-1'
              )}
            />
            <div className="absolute inset-0 rounded-full bg-sidebar-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div className={cn(
            'flex flex-col overflow-hidden transition-all duration-300 ease-out min-w-0',
            isOpen || isMobile ? 'w-auto opacity-100' : 'w-0 opacity-0'
          )}>
            <span className="text-xs font-bold text-sidebar-foreground tracking-tight truncate">
              Sistema de Tickets
            </span>
          </div>
        </Link>
        {/* Close button for mobile */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent transition-transform duration-200 hover:scale-105"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto scrollbar-thin">
        {filteredNavItems.map((item, index) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              data-tour={item.tourId}
              style={{ animationDelay: isMobile && isOpen ? `${index * 50}ms` : '0ms' }}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                'transition-all duration-200 ease-out',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                !isOpen && !isMobile && 'justify-center px-2',
                isMobile && isOpen && 'animate-slide-in-right'
              )}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-sidebar-primary/20 blur-md transition-opacity duration-300" />
              )}
              <Icon className={cn(
                'relative h-5 w-5 flex-shrink-0 transition-transform duration-200', 
                isActive ? 'scale-110' : 'group-hover:scale-110'
              )} />
              <span className={cn(
                'relative truncate transition-all duration-300 ease-out',
                isOpen || isMobile ? 'w-auto opacity-100' : 'w-0 opacity-0 absolute'
              )}>
                {item.label}
              </span>
              
              {/* Tooltip for collapsed state (desktop only) */}
              {!isOpen && !isMobile && (
                <div className={cn(
                  'absolute left-full ml-2 px-2.5 py-1.5 bg-popover text-popover-foreground rounded-lg text-xs font-medium',
                  'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                  'transition-all duration-200 ease-out whitespace-nowrap shadow-lg z-50',
                  'translate-x-1 group-hover:translate-x-0'
                )}>
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
          className={cn(
            'absolute -right-3 top-20 flex h-7 w-7 items-center justify-center rounded-full',
            'border border-sidebar-border bg-card text-foreground shadow-lg z-10',
            'transition-all duration-300 ease-out hover:bg-accent hover:scale-110',
            'hover:shadow-xl active:scale-95'
          )}
        >
          <ChevronLeft className={cn(
            'h-4 w-4 transition-transform duration-300',
            !isOpen && 'rotate-180'
          )} />
        </button>
      )}

      <div className="border-t border-sidebar-border p-4">
        <div className={cn(
          'text-center transition-all duration-300',
          isOpen || isMobile ? 'opacity-100' : 'opacity-0'
        )}>
          <p className="text-[10px] text-sidebar-foreground/40">v2.0.0</p>
        </div>
        {!isOpen && !isMobile && (
          <div className="flex justify-center">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" title="Sistema activo" />
          </div>
        )}
      </div>
    </>
  );

  // Mobile: Full overlay sidebar with smooth animations
  if (isMobile) {
    if (!showMobileSidebar && !isOpen) return null;

    return (
      <>
        {/* Backdrop with blur animation */}
        <div 
          className={cn(
            'fixed inset-0 z-40 bg-black/50 lg:hidden',
            isOpen ? 'animate-backdrop-in' : 'animate-backdrop-out'
          )}
          onClick={onToggle}
        />
        
        {/* Sidebar with slide animation */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col bg-sidebar shadow-2xl lg:hidden',
            isOpen ? 'animate-slide-in-left' : 'animate-slide-out-left'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: Standard sidebar with smooth width transition
  return (
    <aside
      className={cn(
        'relative hidden lg:flex h-full flex-col border-r border-sidebar-border bg-sidebar',
        'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
