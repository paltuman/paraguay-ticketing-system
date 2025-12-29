import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Eye, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    impersonatedUserName, 
    impersonatedProfile,
    impersonatedRoles,
    stopImpersonation 
  } = useImpersonation();
  const navigate = useNavigate();

  const handleStopImpersonation = async () => {
    await stopImpersonation();
    navigate('/users');
  };

  if (!isImpersonating) return null;

  const roleLabel = impersonatedRoles[0] 
    ? impersonatedRoles[0].replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Sin rol';

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-status-in-progress text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Modo Suplantación</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              Viendo como: <strong>{impersonatedUserName}</strong>
            </span>
            {impersonatedProfile?.email && (
              <span className="text-xs opacity-80">({impersonatedProfile.email})</span>
            )}
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{roleLabel}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs opacity-80">
            <AlertTriangle className="h-3 w-3" />
            <span>Las acciones se realizan como el usuario suplantado</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopImpersonation}
            className="text-white hover:bg-white/20 hover:text-white border border-white/30"
          >
            <X className="h-4 w-4 mr-1" />
            Terminar Suplantación
          </Button>
        </div>
      </div>
    </div>
  );
}
