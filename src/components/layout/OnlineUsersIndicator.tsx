import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useGlobalPresence } from '@/hooks/useOnlinePresence';
import { useAuth } from '@/contexts/AuthContext';
import { Users } from 'lucide-react';

export function OnlineUsersIndicator() {
  const { onlineUsers } = useGlobalPresence();
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

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent">
          <div className="relative">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
              {totalOnline}
            </span>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">En línea</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Usuarios en línea ({totalOnline})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {onlineUsers.map((onlineUser) => (
              <div
                key={onlineUser.user_id}
                className="flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={onlineUser.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {onlineUser.profile?.full_name
                        ? getInitials(onlineUser.profile.full_name)
                        : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {onlineUser.profile?.full_name || 'Usuario'}
                    {onlineUser.user_id === user?.id && (
                      <span className="text-xs text-muted-foreground ml-1">(Tú)</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
