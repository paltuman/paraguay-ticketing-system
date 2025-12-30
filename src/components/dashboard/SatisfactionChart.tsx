import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Star, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface SatisfactionData {
  name: string;
  value: number;
  color: string;
}

interface ChartFilters {
  departmentId?: string | null;
  agentId?: string | null;
  startDate?: Date;
  endDate?: Date;
}

interface Props {
  filters?: ChartFilters;
}

export function SatisfactionChart({ filters }: Props) {
  const [data, setData] = useState<SatisfactionData[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalSurveys, setTotalSurveys] = useState<number>(0);
  const [trend, setTrend] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSatisfactionData();
  }, [filters?.startDate, filters?.endDate]);

  const fetchSatisfactionData = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('satisfaction_surveys')
      .select('rating, created_at')
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data: surveys, error } = await query;

    if (error) {
      console.error('Error fetching satisfaction:', error);
      setIsLoading(false);
      return;
    }

    if (!surveys || surveys.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setTotalSurveys(surveys.length);
    const avg = surveys.reduce((sum, s) => sum + s.rating, 0) / surveys.length;
    setAvgRating(Math.round(avg * 10) / 10);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentSurveys = surveys.filter(s => new Date(s.created_at) >= thirtyDaysAgo);
    const olderSurveys = surveys.filter(s => {
      const date = new Date(s.created_at);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    if (recentSurveys.length > 0 && olderSurveys.length > 0) {
      const recentAvg = recentSurveys.reduce((sum, s) => sum + s.rating, 0) / recentSurveys.length;
      const olderAvg = olderSurveys.reduce((sum, s) => sum + s.rating, 0) / olderSurveys.length;
      setTrend(Math.round((recentAvg - olderAvg) * 10) / 10);
    }

    const ratingCounts = [0, 0, 0, 0, 0];
    surveys.forEach(s => {
      if (s.rating >= 1 && s.rating <= 5) {
        ratingCounts[s.rating - 1]++;
      }
    });

    const colors = [
      'hsl(var(--destructive))',
      'hsl(var(--priority-high))',
      'hsl(var(--warning))',
      'hsl(var(--primary))',
      'hsl(var(--success))',
    ];

    const chartData: SatisfactionData[] = [
      { name: '1 estrella', value: ratingCounts[0], color: colors[0] },
      { name: '2 estrellas', value: ratingCounts[1], color: colors[1] },
      { name: '3 estrellas', value: ratingCounts[2], color: colors[2] },
      { name: '4 estrellas', value: ratingCounts[3], color: colors[3] },
      { name: '5 estrellas', value: ratingCounts[4], color: colors[4] },
    ].filter(d => d.value > 0);

    setData(chartData);
    setIsLoading(false);
  };

  return (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Satisfacción
        </CardTitle>
        <div className="flex items-center gap-3">
          {trend !== 0 && (
            <span className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend > 0 ? '+' : ''}{trend}
            </span>
          )}
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-lg font-bold">{avgRating}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <Star className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Sin encuestas aún</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value} encuestas`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs">{item.name}</span>
                  </div>
                  <span className="font-medium text-xs">{item.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border mt-2">
                <p className="text-xs text-muted-foreground">Total: {totalSurveys}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}