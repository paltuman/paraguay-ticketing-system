import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Loader2 } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface TrendData {
  date: string;
  tickets: number;
  resolved: number;
}

interface TicketTrendsChartProps {
  filters?: {
    departmentId: string | null;
    agentId: string | null;
    startDate: Date;
    endDate: Date;
  };
}

export function TicketTrendsChart({ filters }: TicketTrendsChartProps) {
  const [data, setData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrendData();
  }, [filters]);

  const fetchTrendData = async () => {
    setIsLoading(true);
    
    const startDate = filters?.startDate || subDays(new Date(), 14);
    const endDate = filters?.endDate || new Date();
    
    let query = supabase
      .from('tickets')
      .select('created_at, status, resolved_at, department_id, assigned_to')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (filters?.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters?.agentId) {
      query = query.eq('assigned_to', filters.agentId);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Error fetching trends:', error);
      setIsLoading(false);
      return;
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const trendMap = new Map<string, { tickets: number; resolved: number }>();
    
    for (let i = 0; i <= daysDiff; i++) {
      const date = format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      trendMap.set(date, { tickets: 0, resolved: 0 });
    }

    tickets?.forEach((ticket) => {
      const createdDate = format(new Date(ticket.created_at), 'yyyy-MM-dd');
      if (trendMap.has(createdDate)) {
        const current = trendMap.get(createdDate)!;
        current.tickets++;
        trendMap.set(createdDate, current);
      }
      
      if (ticket.resolved_at) {
        const resolvedDate = format(new Date(ticket.resolved_at), 'yyyy-MM-dd');
        if (trendMap.has(resolvedDate)) {
          const current = trendMap.get(resolvedDate)!;
          current.resolved++;
          trendMap.set(resolvedDate, current);
        }
      }
    });

    const trendData: TrendData[] = [];
    trendMap.forEach((value, key) => {
      trendData.push({
        date: format(new Date(key), 'dd MMM', { locale: es }),
        tickets: value.tickets,
        resolved: value.resolved,
      });
    });

    setData(trendData);
    setIsLoading(false);
  };

  return (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Tendencia de Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="tickets"
                name="Creados"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTickets)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resueltos"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResolved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
