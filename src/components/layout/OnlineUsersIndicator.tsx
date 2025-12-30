import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGlobalPresence, OnlineUser } from '@/hooks/useOnlinePresence';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Circle, Clock, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  online: { label: 'En línea', color: 'bg-success', icon: Circle },
  away: { label: 'Ausente', color: 'bg-warning', icon: Clock },
  busy: { label: 'Ocupado', color: 'bg-destructive', icon: MinusCircle },
};

export function OnlineUsersIndicator() {
  const { onlineUsers, currentStatus, setStatus } = useGlobalPresence();
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter out current user from count
  const otherUsers = onlineUsers.filter((u) => u.user_id !== user?.id);
  const totalOnline = otherUsers.length + 1; // +1 for current user

  const getStatusColor = (status: OnlineUser['status']) => {
    return statusConfig[status]?.color || 'bg-success';
  };

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Status Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent">
            <span className={cn('h-2.5 w-2.5 rounded-full animate-pulse', getStatusColor(currentStatus))} />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {statusConfig[currentStatus].label}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {Object.entries(statusConfig).map(([key, config]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => setStatus(key as 'online' | 'away' | 'busy')}
              className="flex items-center gap-2"
            >
              <span className={cn('h-2 w-2 rounded-full', config.color)} />
              {config.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Online Users */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all hover:bg-accent group">
            <div className="relative">
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground shadow-sm">
                {totalOnline}
              </span>
            </div>
            <span className="hidden text-xs text-muted-foreground group-hover:text-foreground transition-colors sm:inline">
              En línea
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="p-3 border-b border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Usuarios en línea ({totalOnline})
            </h4>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            <div className="space-y-1">
              {onlineUsers.map((onlineUser) => (
                <div
                  key={onlineUser.user_id}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-9 w-9 ring-2 ring-background">
                      <AvatarImage src={onlineUser.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {onlineUser.profile?.full_name
                          ? getInitials(onlineUser.profile.full_name)
                          : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span 
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                        getStatusColor(onlineUser.status)
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {onlineUser.profile?.full_name || 'Usuario'}
                      {onlineUser.user_id === user?.id && (
                        <span className="text-xs text-muted-foreground ml-1.5">(Tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statusConfig[onlineUser.status]?.label || 'En línea'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
