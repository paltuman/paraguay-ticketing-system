import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, X, Sparkles, Home, Ticket, MessageCircle, Bell, User, Settings, BarChart3, HelpCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon?: React.ReactNode;
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="create-ticket"]',
    title: 'Crear Nuevo Ticket',
    description: 'Haz clic aquí para crear una nueva solicitud de soporte. Describe tu problema detalladamente y el equipo de TI te ayudará lo antes posible.',
    position: 'bottom',
    icon: <Ticket className="h-5 w-5" />,
  },
  {
    target: '[data-tour="stats-cards"]',
    title: 'Resumen de Estados',
    description: 'Visualiza el estado de todos tus tickets: cuántos están abiertos esperando atención, en proceso de resolución, resueltos o cerrados.',
    position: 'bottom',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    target: '[data-tour="recent-tickets"]',
    title: 'Tickets Recientes',
    description: 'Lista de tus últimos tickets creados. Haz clic en cualquiera para ver los detalles completos, el historial y chatear directamente con el equipo de soporte.',
    position: 'top',
    icon: <MessageCircle className="h-5 w-5" />,
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Centro de Notificaciones',
    description: 'Recibe alertas instantáneas cuando haya respuestas o cambios en tus tickets. El número rojo indica notificaciones sin leer. ¡No te pierdas ninguna actualización importante!',
    position: 'bottom',
    icon: <Bell className="h-5 w-5" />,
  },
  {
    target: '[data-tour="user-menu"]',
    title: 'Tu Perfil de Usuario',
    description: 'Accede a tu información personal, actualiza tu foto de perfil, cambia tu contraseña y cierra sesión de forma segura desde este menú.',
    position: 'bottom',
    icon: <User className="h-5 w-5" />,
  },
  {
    target: '[data-tour="sidebar-tickets"]',
    title: 'Mis Tickets',
    description: 'Navega a esta sección para ver el listado completo de todos tus tickets con filtros avanzados por estado, fecha y búsqueda por palabras clave.',
    position: 'right',
    icon: <Ticket className="h-5 w-5" />,
  },
  {
    target: '[data-tour="sidebar-dashboard"]',
    title: 'Panel Principal',
    description: 'El Dashboard es tu página de inicio. Aquí encontrarás un resumen rápido de toda tu actividad y accesos directos a las funciones más usadas.',
    position: 'right',
    icon: <Home className="h-5 w-5" />,
  },
  {
    target: '[data-tour="theme-toggle"]',
    title: 'Modo Oscuro/Claro',
    description: 'Personaliza la apariencia del sistema. Puedes cambiar entre modo claro y oscuro según tu preferencia para mayor comodidad visual.',
    position: 'bottom',
    icon: <Settings className="h-5 w-5" />,
  },
];

const TOUR_COMPLETED_KEY = 'pai_guided_tour_completed';

export function GuidedTour() {
  const { user, isSupportUser, isAdmin, isSupervisor } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const progressPercentage = ((currentStep + 1) / tourSteps.length) * 100;
  const stepsRemaining = tourSteps.length - currentStep - 1;

  const updateTargetPosition = useCallback(() => {
    if (!isActive) return;
    
    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setTimeout(() => setIsVisible(true), 50);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      if (currentStep < tourSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        completeTour();
      }
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    if (!user || !isSupportUser || isAdmin || isSupervisor) return;

    const completed = localStorage.getItem(`${TOUR_COMPLETED_KEY}_${user.id}`);
    if (completed) return;

    const timer = setTimeout(() => setIsActive(true), 1500);
    return () => clearTimeout(timer);
  }, [user, isSupportUser, isAdmin, isSupervisor]);

  useEffect(() => {
    if (isActive) {
      updateTargetPosition();
      
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
      setIsTransitioning(true);
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsTransitioning(false);
      }, 200);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const handleJumpToStep = (index: number) => {
    if (index !== currentStep) {
      setIsTransitioning(true);
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(index);
        setIsTransitioning(false);
      }, 200);
    }
  };

  if (!isActive || !targetRect) return null;

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  
  const getTooltipStyle = (): React.CSSProperties => {
    const padding = 16;
    const tooltipWidth = Math.min(360, window.innerWidth - 32);
    const tooltipHeight = 280;
    
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

  const getArrowStyle = (): React.CSSProperties => {
    switch (step.position) {
      case 'top':
        return { bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
      case 'bottom':
        return { top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
      case 'left':
        return { right: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
      case 'right':
        return { left: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
    }
  };

  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[9999] animate-fade-in"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        onClick={handleSkip}
      />
      
      {/* Spotlight */}
      <div
        className={cn(
          "fixed z-[10000] rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-transparent",
          "transition-all duration-500 ease-out"
        )}
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Pulsing indicator */}
      <div
        className="fixed z-[10000] pointer-events-none transition-all duration-500"
        style={{
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-16 h-16 rounded-full bg-primary/30 animate-ping" />
      </div>

      {/* Persistent Progress Indicator - Fixed at top */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10002] w-[90%] max-w-md">
        <div className="bg-card/95 backdrop-blur-lg rounded-full px-4 py-2.5 shadow-2xl border border-border/50 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Visita guiada</span>
          </div>
          <div className="flex-1 relative">
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-primary">{currentStep + 1}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{tourSteps.length}</span>
          </div>
          {stepsRemaining > 0 ? (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {stepsRemaining} restante{stepsRemaining > 1 ? 's' : ''}
            </span>
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
        </div>
      </div>

      {/* Tooltip Card */}
      <Card
        className={cn(
          "p-0 overflow-hidden shadow-2xl border-2 border-primary/50",
          "transition-all duration-300 ease-out",
          isVisible && !isTransitioning ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={getTooltipStyle()}
      >
        <div className="absolute w-3 h-3 bg-primary transition-all duration-300" style={getArrowStyle()} />
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/20 transition-transform duration-200 hover:scale-110">
                {step.icon || <HelpCircle className="h-4 w-4" />}
              </div>
              <span className="text-xs font-medium opacity-90">
                Paso {currentStep + 1} de {tourSteps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="p-1.5 rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-110"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-lg font-bold mt-2">{step.title}</h3>
        </div>
        
        {/* Content */}
        <div className="p-4 bg-card">
          <p className="text-sm text-muted-foreground leading-relaxed min-h-[48px]">
            {step.description}
          </p>
          
          {/* Interactive Step Indicators */}
          <div className="flex justify-center gap-1 mt-4 mb-3">
            {tourSteps.map((s, index) => (
              <button
                key={index}
                onClick={() => handleJumpToStep(index)}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300 ease-out hover:scale-110",
                  index === currentStep
                    ? "w-8 bg-primary shadow-lg shadow-primary/30"
                    : index < currentStep
                    ? "w-2.5 bg-primary/60 hover:bg-primary/80"
                    : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                title={s.title}
              />
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              Saltar tour
            </Button>
            
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrev}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Anterior
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={handleNext}
                className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {isLastStep ? (
                  <>
                    ¡Completar!
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

// Export function to reset tour for a specific user (for admin use)
export function resetGuidedTourForUser(userId: string) {
  return `${TOUR_COMPLETED_KEY}_${userId}`;
}

export const TOUR_STORAGE_KEY = TOUR_COMPLETED_KEY;
