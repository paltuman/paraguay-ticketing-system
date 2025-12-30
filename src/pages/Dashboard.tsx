import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { TicketWithRelations, statusLabels, priorityLabels, TicketStatus } from '@/types/database';
import { TopPerformers } from '@/components/dashboard/TopPerformers';
import { TicketTrendsChart } from '@/components/dashboard/TicketTrendsChart';
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart';
import { SatisfactionChart } from '@/components/dashboard/SatisfactionChart';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export default function Dashboard() {
  const { profile, isAdmin, isSupervisor, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [recentTickets, setRecentTickets] = useState<TicketWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize push notifications
  usePushNotifications();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch stats
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('status');

      if (!error && tickets) {
        const statsData: Stats = {
          total: tickets.length,
          open: tickets.filter(t => t.status === 'open').length,
          inProgress: tickets.filter(t => t.status === 'in_progress').length,
          resolved: tickets.filter(t => t.status === 'resolved').length,
          closed: tickets.filter(t => t.status === 'closed').length,
        };
        setStats(statsData);
      }

      // Fetch recent tickets
      const { data: recent, error: recentError } = await supabase
        .from('tickets')
        .select(`
          *,
          creator:profiles!tickets_created_by_fkey(id, full_name, email),
          department:departments(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!recentError && recent) {
        setRecentTickets(recent as unknown as TicketWithRelations[]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
    setIsLoading(false);
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open': return 'bg-status-open text-white';
      case 'in_progress': return 'bg-status-in-progress text-white';
      case 'resolved': return 'bg-status-resolved text-white';
      case 'closed': return 'bg-status-closed text-white';
      default: return 'bg-muted';
    }
  };

  const statCards = [
    {
      title: 'Total Tickets',
      value: stats.total,
      icon: Ticket,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Abiertos',
      value: stats.open,
      icon: AlertCircle,
      color: 'text-status-open',
      bgColor: 'bg-status-open/10',
    },
    {
      title: 'En Proceso',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-status-in-progress',
      bgColor: 'bg-status-in-progress/10',
    },
    {
      title: 'Resueltos',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-status-resolved',
      bgColor: 'bg-status-resolved/10',
    },
    {
      title: 'Cerrados',
      value: stats.closed,
      icon: CheckCircle2,
      color: 'text-status-closed',
      bgColor: 'bg-status-closed/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="hero-section text-primary-foreground">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-foreground/80" />
              <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">
                {isAdmin ? 'Panel de Administración' : isSupervisor ? 'Panel de Supervisión' : 'Panel de Soporte'}
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              Bienvenido/a, {profile?.full_name?.split(' ')[0] || 'Usuario'}
            </h1>
          </div>
          {!isSupervisor && (
            <Button 
              asChild 
              size="lg" 
              className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90 btn-glow"
            >
              <Link to="/tickets/new">
                <PlusCircle className="mr-2 h-5 w-5" />
                Crear Nuevo Ticket
              </Link>
            </Button>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <div className="absolute inset-0 bg-primary-foreground rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="stat-card group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
              <div className={`rounded-xl p-2.5 sm:p-3 ${stat.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.title}</p>
                <p className="text-xl sm:text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section - Only for Admin and Supervisor */}
      {(isAdmin || isSupervisor) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TicketTrendsChart />
          <ResponseTimeChart />
          <SatisfactionChart />
        </div>
      )}

      {/* Quick Actions & Recent Tickets */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2 card-modern">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Tickets Recientes
              </CardTitle>
              <CardDescription className="text-sm mt-1">Últimos tickets del sistema</CardDescription>
            </div>
            <Button variant="ghost" asChild size="sm" className="group">
              <Link to="/tickets" className="text-primary">
                Ver todos 
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3">
              {recentTickets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Ticket className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No hay tickets aún</p>
                  <p className="text-sm text-muted-foreground/70">¡Crea el primero!</p>
                </div>
              ) : (
                recentTickets.map((ticket, index) => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="list-item-interactive animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          #{ticket.ticket_number}
                        </span>
                        <Badge className={`${getStatusColor(ticket.status)} text-xs`} variant="secondary">
                          {statusLabels[ticket.status]}
                        </Badge>
                      </div>
                      <p className="text-sm sm:text-base font-medium truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.department?.name || 'Sin departamento'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3 transition-transform group-hover:translate-x-1" />
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats & Top Performers */}
        <div className="space-y-6">
          <Card className="card-modern">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Resumen Rápido</CardTitle>
              <CardDescription className="text-sm">Estado general del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasa de Resolución</span>
                  <span className="text-lg font-bold text-status-resolved tabular-nums">
                    {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-status-resolved transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tickets Activos</span>
                  <span className="text-lg font-bold text-status-in-progress tabular-nums">
                    {stats.open + stats.inProgress}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-status-in-progress transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${stats.total > 0 ? ((stats.open + stats.inProgress) / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {(isAdmin || isSupervisor) && (
                <Button variant="outline" className="w-full mt-2 group" asChild>
                  <Link to="/statistics">
                    Ver Estadísticas Completas
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Top Performers - Only for Admin and Superadmin */}
          {(isAdmin || isSuperAdmin) && <TopPerformers />}
        </div>
      </div>
    </div>
  );
}
