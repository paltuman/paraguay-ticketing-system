import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, X, Sparkles, Home, Ticket, MessageCircle, Bell, User, Settings, BarChart3, HelpCircle, CheckCircle2, Hand } from 'lucide-react';
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

// Sound utilities
const playSound = (type: 'next' | 'prev' | 'complete' | 'start') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set volume (subtle)
    gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    switch (type) {
      case 'next':
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.1);
        break;
      case 'prev':
        oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.1);
        break;
      case 'complete':
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.15);
        break;
      case 'start':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        break;
    }
    
    oscillator.type = 'sine';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    // Audio not supported, silently fail
  }
};

export function GuidedTour() {
  const { user, isSupportUser, isAdmin, isSupervisor } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Touch/Swipe handling
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

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

    const timer = setTimeout(() => {
      setIsActive(true);
      playSound('start');
    }, 1500);
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

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    
    // Only trigger if horizontal swipe is dominant and significant
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swipe left - next
        handleNext();
      } else {
        // Swipe right - previous
        handlePrev();
      }
    }
  };

  const completeTour = () => {
    if (user) {
      localStorage.setItem(`${TOUR_COMPLETED_KEY}_${user.id}`, 'true');
    }
    playSound('complete');
    setIsActive(false);
    setCurrentStep(0);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      playSound('next');
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
      playSound('prev');
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
      playSound(index > currentStep ? 'next' : 'prev');
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
    const tooltipHeight = 300;
    
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
    top = Math.max(60, Math.min(top, window.innerHeight - tooltipHeight - 16));
    
    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 10001,
    };
  };

  const getArrowStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: '12px',
      height: '12px',
    };
    
    switch (step.position) {
      case 'top':
        return { ...base, bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
      case 'bottom':
        return { ...base, top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
      case 'left':
        return { ...base, right: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
      case 'right':
        return { ...base, left: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
    }
  };

  return createPortal(
    <>
      {/* Semi-transparent overlay - lighter for better visibility */}
      <div 
        className="fixed inset-0 z-[9999] animate-fade-in"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onClick={handleSkip}
      />
      
      {/* Spotlight with glowing effect */}
      <div
        className="fixed z-[10000] rounded-xl transition-all duration-500 ease-out"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          boxShadow: `
            0 0 0 4px hsl(var(--primary)),
            0 0 0 6px hsl(var(--primary) / 0.5),
            0 0 30px 10px hsl(var(--primary) / 0.3),
            0 0 0 9999px rgba(0, 0, 0, 0.6)
          `,
          background: 'transparent',
          pointerEvents: 'none',
        }}
      />
      
      {/* Pulsing ring indicator */}
      <div
        className="fixed z-[10000] pointer-events-none transition-all duration-500"
        style={{
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-20 h-20 rounded-full border-4 border-primary/50 animate-ping" />
        <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-primary animate-pulse" />
      </div>

      {/* Persistent Progress Indicator - Fixed at top */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10002] w-[90%] max-w-md">
        <div className="bg-background/95 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-2xl border-2 border-primary/30 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary whitespace-nowrap">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Visita guiada</span>
          </div>
          <div className="flex-1 relative">
            <Progress value={progressPercentage} className="h-2.5 bg-muted" />
          </div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="text-primary">{currentStep + 1}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">{tourSteps.length}</span>
          </div>
          {stepsRemaining > 0 ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
              ({stepsRemaining} restante{stepsRemaining > 1 ? 's' : ''})
            </span>
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
        </div>
      </div>

      {/* Tooltip Card with Swipe Support */}
      <Card
        ref={tooltipRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "p-0 overflow-hidden border-0",
          "transition-all duration-300 ease-out",
          "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)]",
          isVisible && !isTransitioning ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={getTooltipStyle()}
      >
        {/* Arrow */}
        <div 
          className="bg-primary z-10"
          style={getArrowStyle()} 
        />
        
        {/* Header - Vibrant gradient */}
        <div className="bg-gradient-to-br from-primary via-primary to-secondary p-5 text-primary-foreground relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl transform translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-2xl transform -translate-x-12 translate-y-12" />
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                {step.icon || <HelpCircle className="h-5 w-5" />}
              </div>
              <span className="text-sm font-medium opacity-90">
                Paso {currentStep + 1} de {tourSteps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-110"
              aria-label="Cerrar tour"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <h3 className="text-xl font-bold mt-3 relative z-10">{step.title}</h3>
        </div>
        
        {/* Content */}
        <div className="p-5 bg-background">
          <p className="text-sm text-foreground leading-relaxed min-h-[48px]">
            {step.description}
          </p>
          
          {/* Swipe hint on mobile */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-3 sm:hidden">
            <Hand className="h-3.5 w-3.5" />
            <span>Desliza para navegar</span>
          </div>
          
          {/* Interactive Step Indicators */}
          <div className="flex justify-center gap-1.5 mt-4 mb-4">
            {tourSteps.map((s, index) => (
              <button
                key={index}
                onClick={() => handleJumpToStep(index)}
                className={cn(
                  "h-3 rounded-full transition-all duration-300 ease-out hover:scale-125",
                  index === currentStep
                    ? "w-10 bg-primary shadow-lg shadow-primary/40"
                    : index < currentStep
                    ? "w-3 bg-primary/70 hover:bg-primary"
                    : "w-3 bg-muted hover:bg-muted-foreground/50"
                )}
                title={s.title}
                aria-label={`Ir al paso ${index + 1}: ${s.title}`}
              />
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Saltar
            </Button>
            
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrev}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={handleNext}
                className="transition-all duration-200 hover:scale-105 hover:shadow-lg bg-primary hover:bg-primary/90"
              >
                {isLastStep ? (
                  <>
                    ¡Completar!
                    <Sparkles className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className="h-4 w-4 ml-1" />
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
