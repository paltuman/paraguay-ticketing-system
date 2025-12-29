import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';
import { logAuditEvent } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUserName, impersonatedUserId, originalUserId, stopImpersonation } = useImpersonation();
  const { user } = useAuth();

  const handleStopImpersonation = async () => {
    // Log audit event
    if (originalUserId && impersonatedUserId) {
      await logAuditEvent({
        action: 'user_impersonation_ended',
        entityType: 'user',
        entityId: impersonatedUserId,
        details: { 
          target_name: impersonatedUserName,
        },
        userId: originalUserId,
      });
    }
    
    stopImpersonation();
  };

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-status-in-progress text-white px-4 py-2 flex items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">
          Estás viendo el sistema como: <strong>{impersonatedUserName}</strong>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStopImpersonation}
        className="text-white hover:bg-white/20 hover:text-white"
      >
        <X className="h-4 w-4 mr-1" />
        Salir del modo suplantación
      </Button>
    </div>
  );
}
