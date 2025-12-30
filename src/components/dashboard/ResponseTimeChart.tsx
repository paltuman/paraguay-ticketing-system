import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ResponseData {
  range: string;
  count: number;
  color: string;
}

interface ResponseTimeChartProps {
  filters?: {
    departmentId: string | null;
    agentId: string | null;
    startDate: Date;
    endDate: Date;
  };
}

export function ResponseTimeChart({ filters }: ResponseTimeChartProps) {
  const [data, setData] = useState<ResponseData[]>([]);
  const [avgTime, setAvgTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchResponseData();
  }, [filters]);

  const fetchResponseData = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('tickets')
      .select('created_at, resolved_at, department_id, assigned_to')
      .not('resolved_at', 'is', null);

    if (filters?.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters?.agentId) {
      query = query.eq('assigned_to', filters.agentId);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Error fetching response times:', error);
      setIsLoading(false);
      return;
    }

    const responseTimes = tickets?.map((ticket) => {
      const created = new Date(ticket.created_at).getTime();
      const resolved = new Date(ticket.resolved_at!).getTime();
      return (resolved - created) / (1000 * 60 * 60);
    }) || [];

    const avg = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    setAvgTime(Math.round(avg * 10) / 10);

    const ranges = [
      { label: '< 1h', max: 1, color: 'hsl(var(--success))' },
      { label: '1-4h', max: 4, color: 'hsl(var(--primary))' },
      { label: '4-12h', max: 12, color: 'hsl(var(--warning))' },
      { label: '12-24h', max: 24, color: 'hsl(var(--priority-high))' },
      { label: '> 24h', max: Infinity, color: 'hsl(var(--destructive))' },
    ];

    const grouped: ResponseData[] = ranges.map((range, index) => {
      const prevMax = index === 0 ? 0 : ranges[index - 1].max;
      const count = responseTimes.filter(t => t > prevMax && t <= range.max).length;
      return { range: range.label, count, color: range.color };
    });

    setData(grouped);
    setIsLoading(false);
  };

  return (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Tiempos de Respuesta
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Promedio:</span>
          <span className="text-sm font-bold text-primary">{avgTime}h</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="range" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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
                formatter={(value: number) => [`${value} tickets`, 'Cantidad']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
