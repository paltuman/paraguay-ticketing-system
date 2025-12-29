import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy, Award, Medal } from 'lucide-react';

interface PerformanceStats {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  avg_rating: number;
  total_surveys: number;
  resolved_tickets: number;
  total_tickets: number;
}

export function TopPerformers() {
  const [performers, setPerformers] = useState<PerformanceStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTopPerformers();
  }, []);

  const fetchTopPerformers = async () => {
    // First get users who have admin or superadmin roles
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'superadmin']);

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      setIsLoading(false);
      return;
    }

    const adminUserIds = adminRoles?.map(r => r.user_id) || [];

    if (adminUserIds.length === 0) {
      setPerformers([]);
      setIsLoading(false);
      return;
    }

    // Fetch performance stats only for admin users
    const { data, error } = await supabase
      .from('user_performance_stats')
      .select('*')
      .gt('resolved_tickets', 0)
      .in('user_id', adminUserIds)
      .order('avg_rating', { ascending: false })
      .order('resolved_tickets', { ascending: false })
      .limit(5);

    if (!error && data) {
      setPerformers(data as PerformanceStats[]);
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

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Award className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Administradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (performers.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Administradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-4">
            Aún no hay datos de administradores
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Administradores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {performers.map((performer, index) => (
            <div
              key={performer.user_id}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
            >
              <div className="flex h-8 w-8 items-center justify-center">
                {getRankIcon(index)}
              </div>
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={performer.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(performer.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{performer.full_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {Number(performer.avg_rating).toFixed(1)}
                  </span>
                  <span>•</span>
                  <span>{performer.resolved_tickets} resueltos</span>
                </div>
              </div>
              {index < 3 && (
                <Badge variant="secondary" className="text-[10px]">
                  Top {index + 1}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
