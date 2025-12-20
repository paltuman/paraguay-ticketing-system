import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';

interface OnlineUser {
  id: string;
  user_id: string;
  last_seen: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface OnlineUsersProps {
  viewers: OnlineUser[];
}

export function OnlineUsers({ viewers }: OnlineUsersProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (viewers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span className="hidden sm:inline">En línea:</span>
      </div>
      <div className="flex -space-x-2">
        <TooltipProvider>
          {viewers.slice(0, 5).map((viewer) => (
            <Tooltip key={viewer.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-background ring-2 ring-green-500">
                    <AvatarImage src={viewer.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                      {viewer.profile?.full_name ? getInitials(viewer.profile.full_name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{viewer.profile?.full_name || 'Usuario'}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {viewers.length > 5 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                  +{viewers.length - 5}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{viewers.length - 5} más conectados</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
