import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="create-ticket"]',
    title: '📝 Crear Nuevo Ticket',
    description: 'Haz clic aquí para crear una nueva solicitud de soporte. Describe tu problema y el equipo de TI te ayudará.',
    position: 'bottom',
  },
  {
    target: '[data-tour="stats-cards"]',
    title: '📊 Resumen de Tickets',
    description: 'Aquí ves el estado de tus tickets: cuántos están abiertos, en proceso, resueltos o cerrados.',
    position: 'bottom',
  },
  {
    target: '[data-tour="recent-tickets"]',
    title: '📋 Tickets Recientes',
    description: 'Lista de tus últimos tickets. Haz clic en cualquiera para ver detalles y chatear con soporte.',
    position: 'top',
  },
  {
    target: '[data-tour="notifications"]',
    title: '🔔 Notificaciones',
    description: 'Te avisamos cuando haya respuestas o cambios en tus tickets. ¡No te pierdas ninguna actualización!',
    position: 'bottom',
  },
  {
    target: '[data-tour="user-menu"]',
    title: '👤 Tu Perfil',
    description: 'Accede a tu perfil, actualiza tu información personal y cierra sesión desde aquí.',
    position: 'bottom',
  },
  {
    target: '[data-tour="sidebar-tickets"]',
    title: '🎫 Mis Tickets',
    description: 'Ve a esta sección para ver todos tus tickets con filtros y búsqueda avanzada.',
    position: 'right',
  },
];

const TOUR_COMPLETED_KEY = 'pai_guided_tour_completed';

export function GuidedTour() {
  const { user, isSupportUser, isAdmin, isSupervisor } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const updateTargetPosition = useCallback(() => {
    if (!isActive) return;
    
    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setIsVisible(true);
      
      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setIsVisible(false);
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    // Only show for support users (not admins or supervisors)
    if (!user || !isSupportUser || isAdmin || isSupervisor) return;

    const completed = localStorage.getItem(`${TOUR_COMPLETED_KEY}_${user.id}`);
    if (!completed) {
      // Start tour after a short delay
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, isSupportUser, isAdmin, isSupervisor]);

  useEffect(() => {
    if (isActive) {
      updateTargetPosition();
      
      // Update position on scroll/resize
      window.addEventListener('scroll', updateTargetPosition, true);
      window.addEventListener('resize', updateTargetPosition);
      
      return () => {
        window.removeEventListener('scroll', updateTargetPosition, true);
        window.removeEventListener('resize', updateTargetPosition);
      };
    }
  }, [isActive, updateTargetPosition]);

  const completeTour = () => {
    if (user) {
      localStorage.setItem(`${TOUR_COMPLETED_KEY}_${user.id}`, 'true');
    }
    setIsActive(false);
    setCurrentStep(0);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  if (!isActive || !targetRect) return null;

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  
  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    
    let top = 0;
    let left = 0;
    
    switch (step.position) {
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.right + padding;
        break;
    }
    
    // Keep tooltip within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
    
    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 10001,
    };
  };

  // Calculate arrow position
  const getArrowStyle = (): React.CSSProperties => {
    const size = 12;
    
    switch (step.position) {
      case 'top':
        return {
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        };
      case 'bottom':
        return {
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        };
      case 'left':
        return {
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
        };
      case 'right':
        return {
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
        };
    }
  };

  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[9999] transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onClick={handleSkip}
      />
      
      {/* Spotlight on target */}
      <div
        className="fixed z-[10000] transition-all duration-300 rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-transparent"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Pulsing indicator */}
      <div
        className="fixed z-[10000] pointer-events-none"
        style={{
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-16 h-16 rounded-full bg-primary/30 animate-ping" />
      </div>

      {/* Tooltip Card */}
      <Card
        className={cn(
          "p-0 overflow-hidden shadow-2xl border-2 border-primary/50 animate-fade-in",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={getTooltipStyle()}
      >
        {/* Arrow */}
        <div 
          className="absolute w-3 h-3 bg-primary"
          style={getArrowStyle()}
        />
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">
                Paso {currentStep + 1} de {tourSteps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-lg font-bold mt-2">{step.title}</h3>
        </div>
        
        {/* Content */}
        <div className="p-4 bg-card">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-4 mb-3">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep
                    ? "w-6 bg-primary"
                    : index < currentStep
                    ? "bg-primary/60"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground text-xs"
            >
              Saltar tour
            </Button>
            
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Anterior
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLastStep ? (
                  <>
                    ¡Entendido!
                    <Sparkles className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </>,
    document.body
  );
}

// Export function to manually start tour
export function startGuidedTour(userId: string) {
  localStorage.removeItem(`${TOUR_COMPLETED_KEY}_${userId}`);
  window.location.reload();
}
