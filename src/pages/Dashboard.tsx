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
} from 'lucide-react';
import { TicketWithRelations, statusLabels, priorityLabels, TicketStatus } from '@/types/database';
import { TopPerformers } from '@/components/dashboard/TopPerformers';

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
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Bienvenido, {profile?.full_name?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isAdmin ? 'Panel de Administración' : isSupervisor ? 'Panel de Supervisión' : 'Panel de Soporte'}
          </p>
        </div>
        {!isSupervisor && (
          <Button asChild className="w-full sm:w-fit">
            <Link to="/tickets/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Ticket
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title} className="animate-slide-up border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center gap-3 sm:gap-4 p-3 sm:p-6">
              <div className={`rounded-lg p-2 sm:p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 sm:h-6 sm:w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Tickets */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 sm:pb-6">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Tickets Recientes
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Últimos tickets del sistema</CardDescription>
            </div>
            <Button variant="ghost" asChild size="sm">
              <Link to="/tickets" className="text-primary">
                Ver todos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="space-y-2 sm:space-y-3">
              {recentTickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No hay tickets aún. ¡Crea el primero!
                </p>
              ) : (
                recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 sm:p-4 transition-all hover:bg-accent hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                          #{ticket.ticket_number}
                        </span>
                        <Badge className={`${getStatusColor(ticket.status)} text-[10px] sm:text-xs`} variant="secondary">
                          {statusLabels[ticket.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm sm:text-base font-medium truncate">{ticket.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {ticket.department?.name || 'Sin departamento'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats & Top Performers */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Resumen Rápido</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Estado general del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Tasa de Resolución</span>
                  <span className="font-semibold text-status-resolved">
                    {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-status-resolved transition-all duration-500"
                    style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Tickets Activos</span>
                  <span className="font-semibold text-status-in-progress">
                    {stats.open + stats.inProgress}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-status-in-progress transition-all duration-500"
                    style={{ width: `${stats.total > 0 ? ((stats.open + stats.inProgress) / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {(isAdmin || isSupervisor) && (
                <Button variant="outline" className="w-full mt-4" asChild size="sm">
                  <Link to="/statistics">
                    Ver Estadísticas Completas
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
