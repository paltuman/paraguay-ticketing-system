import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpIndicatorProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const HELP_DISMISSED_KEY = 'pai_help_indicators_dismissed';

export function HelpIndicator({
  id,
  title,
  description,
  children,
  position = 'top',
  className,
}: HelpIndicatorProps) {
  const { user, isSupportUser, isAdmin, isSupervisor } = useAuth();
  const [isDismissed, setIsDismissed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!user || !isSupportUser || isAdmin || isSupervisor) {
      setIsDismissed(true);
      return;
    }

    const dismissed = localStorage.getItem(`${HELP_DISMISSED_KEY}_${user.id}`);
    if (dismissed) {
      const dismissedIds: string[] = JSON.parse(dismissed);
      setIsDismissed(dismissedIds.includes(id));
    } else {
      setIsDismissed(false);
    }
  }, [user, id, isSupportUser, isAdmin, isSupervisor]);

  const handleDismiss = () => {
    if (!user) return;
    
    const dismissed = localStorage.getItem(`${HELP_DISMISSED_KEY}_${user.id}`);
    const dismissedIds: string[] = dismissed ? JSON.parse(dismissed) : [];
    
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      localStorage.setItem(`${HELP_DISMISSED_KEY}_${user.id}`, JSON.stringify(dismissedIds));
    }
    
    setIsDismissed(true);
  };

  // Don't show for non-support users or if dismissed
  if (isDismissed) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      
      <Tooltip open={isHovered} onOpenChange={setIsHovered}>
        <TooltipTrigger asChild>
          <button
            onClick={handleDismiss}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="absolute -top-2 -right-2 z-10 p-1 rounded-full bg-primary text-primary-foreground shadow-lg animate-pulse hover:animate-none transition-all hover:scale-110"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={position} 
          className="max-w-[250px] p-3 space-y-1"
        >
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="text-[10px] text-muted-foreground/70 italic mt-2">
            Clic para ocultar esta ayuda
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// Reset all help indicators for a user
export function resetHelpIndicators(userId: string) {
  localStorage.removeItem(`${HELP_DISMISSED_KEY}_${userId}`);
}
