import { useEffect, useState, useRef } from 'react';
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
  BarChart3,
  FileDown,
} from 'lucide-react';
import { TicketWithRelations, statusLabels, TicketStatus } from '@/types/database';
import { TopPerformers } from '@/components/dashboard/TopPerformers';
import { TicketTrendsChart } from '@/components/dashboard/TicketTrendsChart';
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart';
import { SatisfactionChart } from '@/components/dashboard/SatisfactionChart';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subDays } from 'date-fns';
import { toast } from 'sonner';

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

interface Department {
  id: string;
  name: string;
}

export default function Dashboard() {
  const { profile, isAdmin, isSupervisor, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [recentTickets, setRecentTickets] = useState<TicketWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('14d');
  const chartsRef = useRef<HTMLDivElement>(null);
  
  usePushNotifications();

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDept, selectedPeriod]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    if (data) setDepartments(data);
  };

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    switch (selectedPeriod) {
      case '7d': start = subDays(end, 7); break;
      case '30d': start = subDays(end, 30); break;
      default: start = subDays(end, 14);
    }
    return { start, end };
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      let query = supabase.from('tickets').select('status, department_id, created_at');

      if (selectedDept !== 'all') {
        query = query.eq('department_id', selectedDept);
      }
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());

      const { data: tickets, error } = await query;

      if (!error && tickets) {
        setStats({
          total: tickets.length,
          open: tickets.filter(t => t.status === 'open').length,
          inProgress: tickets.filter(t => t.status === 'in_progress').length,
          resolved: tickets.filter(t => t.status === 'resolved').length,
          closed: tickets.filter(t => t.status === 'closed').length,
        });
      }

      const { data: recent } = await supabase
        .from('tickets')
        .select(`*, creator:profiles!tickets_created_by_fkey(id, full_name, email), department:departments(id, name)`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recent) setRecentTickets(recent as unknown as TicketWithRelations[]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
    setIsLoading(false);
  };

  const handleExport = async () => {
    toast.info('Exportando reporte...');
    // Simple export notification
    setTimeout(() => toast.success('Funcionalidad de exportación disponible en Estadísticas'), 1500);
  };

  const getStatusColor = (status: TicketStatus) => {
    const colors: Record<TicketStatus, string> = {
      'open': 'bg-status-open text-white',
      'in_progress': 'bg-status-in-progress text-white',
      'resolved': 'bg-status-resolved text-white',
      'closed': 'bg-status-closed text-white',
    };
    return colors[status] || 'bg-muted';
  };

  const statCards = [
    { title: 'Total Tickets', value: stats.total, icon: Ticket, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Abiertos', value: stats.open, icon: AlertCircle, color: 'text-status-open', bgColor: 'bg-status-open/10' },
    { title: 'En Proceso', value: stats.inProgress, icon: Clock, color: 'text-status-in-progress', bgColor: 'bg-status-in-progress/10' },
    { title: 'Resueltos', value: stats.resolved, icon: CheckCircle2, color: 'text-status-resolved', bgColor: 'bg-status-resolved/10' },
    { title: 'Cerrados', value: stats.closed, icon: CheckCircle2, color: 'text-status-closed', bgColor: 'bg-status-closed/10' },
  ];

  const filters = {
    departmentId: selectedDept === 'all' ? null : selectedDept,
    agentId: null,
    startDate: getDateRange().start,
    endDate: getDateRange().end,
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section */}
      <div className="hero-section text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-secondary opacity-95" />
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15 0L30 15L15 30L0 15z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E\")" }} />
        
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-foreground/80 animate-pulse" />
              <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">
                {isAdmin ? 'Panel de Administración' : isSupervisor ? 'Panel de Supervisión' : 'Panel de Soporte'}
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold drop-shadow-sm">
              Bienvenido/a, {profile?.full_name?.split(' ')[0] || 'Usuario'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(isAdmin || isSupervisor) && (
              <Button variant="outline" size="sm" onClick={handleExport} className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            )}
            {!isSupervisor && (
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                <Link to="/tickets/new">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Crear Nuevo Ticket
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {(isAdmin || isSupervisor) && (
        <Card className="glass-card border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Filtros:
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[160px] h-9 bg-background/50">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 días</SelectItem>
                  <SelectItem value="14d">Últimos 14 días</SelectItem>
                  <SelectItem value="30d">Últimos 30 días</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[180px] h-9 bg-background/50">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat, index) => (
          <Card key={stat.title} className="stat-card group hover:shadow-xl transition-all duration-500" style={{ animationDelay: `${index * 80}ms` }}>
            <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
              <div className={`rounded-xl p-2.5 sm:p-3 ${stat.bgColor} transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg`}>
                <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color} transition-transform duration-300`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.title}</p>
                <p className="text-xl sm:text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      {(isAdmin || isSupervisor) && (
        <div ref={chartsRef} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Análisis y Métricas</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TicketTrendsChart filters={filters} />
            <ResponseTimeChart filters={filters} />
            <SatisfactionChart filters={filters} />
          </div>
        </div>
      )}

      {/* Recent Tickets & Quick Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 glass-card border-0 shadow-lg hover:shadow-xl transition-shadow duration-500">
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
            <Button variant="ghost" asChild size="sm" className="group hover:bg-primary/10">
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
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4 shadow-inner">
                    <Ticket className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No hay tickets aún</p>
                  <p className="text-sm text-muted-foreground/70">¡Crea el primero!</p>
                </div>
              ) : (
                recentTickets.map((ticket, index) => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all duration-300 hover:bg-accent/50 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 animate-fade-in group"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md">
                          #{ticket.ticket_number}
                        </span>
                        <Badge className={`${getStatusColor(ticket.status)} text-xs shadow-sm`} variant="secondary">
                          {statusLabels[ticket.status]}
                        </Badge>
                      </div>
                      <p className="text-sm sm:text-base font-medium truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.department?.name || 'Sin departamento'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card border-0 shadow-lg">
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
                <div className="h-3 rounded-full bg-muted overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-status-resolved to-success transition-all duration-1000 ease-out rounded-full"
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
                <div className="h-3 rounded-full bg-muted overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-status-in-progress to-warning transition-all duration-1000 ease-out rounded-full"
                    style={{ width: `${stats.total > 0 ? ((stats.open + stats.inProgress) / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {(isAdmin || isSupervisor) && (
                <Button variant="outline" className="w-full mt-2 group hover:bg-primary hover:text-primary-foreground transition-all duration-300" asChild>
                  <Link to="/statistics">
                    Ver Estadísticas Completas
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {(isAdmin || isSuperAdmin) && <TopPerformers />}
        </div>
      </div>
    </div>
  );
}
