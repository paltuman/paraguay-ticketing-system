import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Loader2,
  TrendingUp,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Department, TicketStatus, statusLabels } from '@/types/database';
import { Navigate } from 'react-router-dom';

interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byDepartment: { name: string; count: number }[];
  byPriority: { name: string; count: number }[];
  trend: { date: string; count: number }[];
}

const STATUS_COLORS = {
  open: '#2563eb',
  in_progress: '#eab308',
  resolved: '#22c55e',
  closed: '#6b7280',
};

const PRIORITY_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

export default function Statistics() {
  const { isAdmin, isSupervisor } = useAuth();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authorized
  if (!isAdmin && !isSupervisor) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchDepartments();
    fetchStats();
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);

    let query = supabase.from('tickets').select(`
      id,
      status,
      priority,
      department_id,
      created_at,
      department:departments(name)
    `);

    if (selectedDepartment !== 'all') {
      query = query.eq('department_id', selectedDepartment);
    }

    const { data: tickets, error } = await query;

    if (error || !tickets) {
      setIsLoading(false);
      return;
    }

    // Calculate stats
    const byStatus: Record<TicketStatus, number> = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    const deptCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    const dateCounts: Record<string, number> = {};

    tickets.forEach((ticket: any) => {
      // By status
      byStatus[ticket.status as TicketStatus]++;

      // By department
      const deptName = ticket.department?.name || 'Sin asignar';
      deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;

      // By priority
      priorityCounts[ticket.priority]++;

      // By date (last 7 days)
      const date = new Date(ticket.created_at).toLocaleDateString('es-PY', {
        day: '2-digit',
        month: 'short',
      });
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    const byDepartment = Object.entries(deptCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const byPriority = [
      { name: 'Baja', count: priorityCounts.low },
      { name: 'Media', count: priorityCounts.medium },
      { name: 'Alta', count: priorityCounts.high },
      { name: 'Urgente', count: priorityCounts.urgent },
    ];

    const trend = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .slice(-7);

    setStats({
      total: tickets.length,
      byStatus,
      byDepartment,
      byPriority,
      trend,
    });

    setIsLoading(false);
  };

  const statusPieData = stats
    ? [
        { name: 'Abiertos', value: stats.byStatus.open, color: STATUS_COLORS.open },
        { name: 'En Proceso', value: stats.byStatus.in_progress, color: STATUS_COLORS.in_progress },
        { name: 'Resueltos', value: stats.byStatus.resolved, color: STATUS_COLORS.resolved },
        { name: 'Cerrados', value: stats.byStatus.closed, color: STATUS_COLORS.closed },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estadísticas</h1>
          <p className="text-muted-foreground">
            Panel de indicadores del sistema de tickets
          </p>
        </div>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-[250px]">
            <Building2 className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Ticket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tickets</p>
              <p className="text-3xl font-bold">{stats?.total || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-status-open/10 p-3">
              <AlertCircle className="h-6 w-6 text-status-open" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Abiertos</p>
              <p className="text-3xl font-bold">{stats?.byStatus.open || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-status-in-progress/10 p-3">
              <Clock className="h-6 w-6 text-status-in-progress" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En Proceso</p>
              <p className="text-3xl font-bold">{stats?.byStatus.in_progress || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-status-resolved/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-status-resolved" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resueltos</p>
              <p className="text-3xl font-bold">{stats?.byStatus.resolved || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Pie Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
            <CardDescription>Tickets agrupados por estado actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {statusPieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Bar Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Tickets por Departamento</CardTitle>
            <CardDescription>Top 8 departamentos con más tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.byDepartment || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(211 84% 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Distribución por Prioridad</CardTitle>
            <CardDescription>Tickets agrupados por nivel de prioridad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.byPriority || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats?.byPriority.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend Line Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tendencia de Tickets
            </CardTitle>
            <CardDescription>Tickets creados en los últimos días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(211 84% 45%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(211 84% 45%)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Rate */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Indicadores de Rendimiento</CardTitle>
          <CardDescription>Métricas clave del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Tasa de Resolución</p>
              <p className="text-4xl font-bold text-status-resolved">
                {stats && stats.total > 0
                  ? Math.round(((stats.byStatus.resolved + stats.byStatus.closed) / stats.total) * 100)
                  : 0}
                %
              </p>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-status-resolved transition-all"
                  style={{
                    width: `${
                      stats && stats.total > 0
                        ? ((stats.byStatus.resolved + stats.byStatus.closed) / stats.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Tickets Activos</p>
              <p className="text-4xl font-bold text-status-in-progress">
                {stats ? stats.byStatus.open + stats.byStatus.in_progress : 0}
              </p>
              <Badge className="mt-2 bg-status-in-progress/20 text-status-in-progress">
                Requieren atención
              </Badge>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Tickets Pendientes</p>
              <p className="text-4xl font-bold text-status-open">
                {stats?.byStatus.open || 0}
              </p>
              <Badge className="mt-2 bg-status-open/20 text-status-open">
                Sin asignar
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
