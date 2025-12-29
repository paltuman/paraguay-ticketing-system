import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trophy, Medal, Award, Ticket } from 'lucide-react';

interface TicketCreator {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  ticket_count: number;
  department_name: string | null;
}

export function TopTicketCreators() {
  const [creators, setCreators] = useState<TicketCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTopCreators();
  }, []);

  const fetchTopCreators = async () => {
    setIsLoading(true);
    
    // Get tickets with creator info
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        created_by,
        creator:profiles!tickets_created_by_fkey(
          id,
          full_name,
          email,
          avatar_url,
          department:departments(name)
        )
      `)
      .not('created_by', 'is', null);

    if (error || !tickets) {
      setIsLoading(false);
      return;
    }

    // Count tickets per user
    const userCounts: Record<string, TicketCreator> = {};
    
    tickets.forEach((ticket: any) => {
      if (!ticket.creator) return;
      
      const userId = ticket.created_by;
      if (!userCounts[userId]) {
        userCounts[userId] = {
          user_id: userId,
          full_name: ticket.creator.full_name,
          email: ticket.creator.email,
          avatar_url: ticket.creator.avatar_url,
          ticket_count: 0,
          department_name: ticket.creator.department?.name || null,
        };
      }
      userCounts[userId].ticket_count++;
    });

    // Sort by ticket count and get top 10
    const sorted = Object.values(userCounts)
      .sort((a, b) => b.ticket_count - a.ticket_count)
      .slice(0, 10);

    setCreators(sorted);
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
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="flex h-5 w-5 items-center justify-center text-sm font-bold text-muted-foreground">
            {index + 1}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Usuarios Más Frecuentes
          </CardTitle>
          <CardDescription>Usuarios que más tickets han creado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (creators.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Usuarios Más Frecuentes
          </CardTitle>
          <CardDescription>Usuarios que más tickets han creado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay datos disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Usuarios Más Frecuentes
        </CardTitle>
        <CardDescription>Top 10 usuarios que más tickets han creado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {creators.map((creator, index) => (
            <div
              key={creator.user_id}
              className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                index < 3 ? 'bg-accent/50' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(index)}
              </div>
              
              <Avatar className="h-10 w-10">
                <AvatarImage src={creator.avatar_url || undefined} alt={creator.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(creator.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {creator.full_name}
                </p>
                {creator.department_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {creator.department_name}
                  </p>
                )}
              </div>

              <Badge 
                variant="secondary" 
                className="flex items-center gap-1.5 bg-primary/10 text-primary"
              >
                <Ticket className="h-3 w-3" />
                {creator.ticket_count}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
