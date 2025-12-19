import { Check, CheckCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageStatusProps {
  status: 'sent' | 'delivered' | 'read';
}

export function MessageStatus({ status }: MessageStatusProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'read':
        return { icon: <CheckCheck className="h-3 w-3 text-blue-500" />, label: 'Leído' };
      case 'delivered':
        return { icon: <CheckCheck className="h-3 w-3 opacity-60" />, label: 'Entregado' };
      case 'sent':
      default:
        return { icon: <Check className="h-3 w-3 opacity-60" />, label: 'Enviado' };
    }
  };

  const { icon, label } = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{icon}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
