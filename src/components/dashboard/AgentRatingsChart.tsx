import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Users } from 'lucide-react';
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

interface AgentRating {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  avg_rating: number;
  total_surveys: number;
  resolved_tickets: number;
}

export function AgentRatingsChart() {
  const [agents, setAgents] = useState<AgentRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAgentRatings();
  }, []);

  const fetchAgentRatings = async () => {
    const { data, error } = await supabase
      .from('user_performance_stats')
      .select('*')
      .gt('total_surveys', 0)
      .order('avg_rating', { ascending: false });

    if (!error && data) {
      setAgents(data as AgentRating[]);
    }
    setIsLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return '#22c55e';
    if (rating >= 3.5) return '#eab308';
    if (rating >= 2.5) return '#f97316';
    return '#ef4444';
  };

  const chartData = agents.slice(0, 10).map((agent) => ({
    name: agent.full_name?.split(' ')[0] || 'Usuario',
    rating: Number(agent.avg_rating) || 0,
    surveys: agent.total_surveys,
    color: getRatingColor(Number(agent.avg_rating)),
  }));

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Calificaciones por Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (agents.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Calificaciones por Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-8">
            Aún no hay calificaciones registradas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Calificaciones por Agente
        </CardTitle>
        <CardDescription>
          Promedio de calificaciones de los agentes de soporte
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 5]} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold">{data.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {data.surveys} encuestas
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="rating" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent List */}
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Detalle de Agentes
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {agents.slice(0, 6).map((agent) => (
              <div
                key={agent.user_id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={agent.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(agent.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{agent.full_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {Number(agent.avg_rating).toFixed(1)}
                    </span>
                    <span>•</span>
                    <span>{agent.total_surveys} encuestas</span>
                  </div>
                </div>
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: `${getRatingColor(Number(agent.avg_rating))}20`,
                    color: getRatingColor(Number(agent.avg_rating)),
                  }}
                >
                  {agent.resolved_tickets} resueltos
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
