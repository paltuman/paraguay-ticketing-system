import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Ticket,
  MessageSquare,
  Bell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  PlusCircle,
  Search,
  Star,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ElementType;
  tips: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: '¡Bienvenido al Sistema de Soporte!',
    description: 'Este tutorial te guiará a través de las funciones principales del sistema. Aprenderás cómo crear tickets, comunicarte con el equipo de soporte y hacer seguimiento de tus solicitudes.',
    icon: Sparkles,
    tips: [
      'El sistema está diseñado para facilitar la comunicación con el equipo de TI',
      'Podrás ver el estado de tus solicitudes en tiempo real',
      'Recibirás notificaciones cuando haya actualizaciones',
    ],
  },
  {
    title: 'Crear un Nuevo Ticket',
    description: 'Los tickets son la forma principal de solicitar ayuda. Cada ticket representa una solicitud o problema que necesitas resolver.',
    icon: PlusCircle,
    tips: [
      'Usa el botón "Crear Ticket" en el Dashboard o en la sección de Tickets',
      'Describe tu problema de forma clara y detallada',
      'Selecciona la prioridad según la urgencia del problema',
      'Puedes adjuntar capturas de pantalla o archivos relevantes',
    ],
  },
  {
    title: 'Ver y Gestionar tus Tickets',
    description: 'En la sección "Mis Tickets" puedes ver todas tus solicitudes y su estado actual.',
    icon: Ticket,
    tips: [
      'Usa los filtros para encontrar tickets específicos',
      'Los estados son: Abierto, En Proceso, Resuelto y Cerrado',
      'Haz clic en un ticket para ver sus detalles completos',
      'Puedes buscar por número de ticket o palabras clave',
    ],
  },
  {
    title: 'Chat en Tiempo Real',
    description: 'Cada ticket tiene un chat integrado para comunicarte directamente con el agente asignado.',
    icon: MessageSquare,
    tips: [
      'Escribe mensajes para proporcionar información adicional',
      'Puedes enviar notas de voz si es más fácil explicar el problema',
      'Los mensajes llegan en tiempo real al agente',
      'El historial del chat se guarda para referencia futura',
    ],
  },
  {
    title: 'Notificaciones',
    description: 'El sistema te notifica cuando hay cambios importantes en tus tickets.',
    icon: Bell,
    tips: [
      'Recibirás notificaciones cuando un agente responda',
      'Serás notificado cuando cambie el estado de tu ticket',
      'Activa las notificaciones del navegador para no perderte nada',
      'Revisa el ícono de campana para ver notificaciones pendientes',
    ],
  },
  {
    title: 'Encuesta de Satisfacción',
    description: 'Cuando tu ticket sea resuelto, podrás calificar la atención recibida.',
    icon: Star,
    tips: [
      'Tu opinión nos ayuda a mejorar el servicio',
      'La encuesta aparece cuando el ticket se marca como resuelto',
      'Puedes dejar comentarios adicionales para el equipo',
      'Las calificaciones son confidenciales',
    ],
  },
  {
    title: '¡Listo para Comenzar!',
    description: 'Ya conoces las funciones principales del sistema. Si tienes dudas, no dudes en crear un ticket de soporte.',
    icon: CheckCircle2,
    tips: [
      'Puedes volver a ver este tutorial desde tu perfil',
      'El equipo de soporte está disponible para ayudarte',
      '¡Gracias por usar el sistema de soporte PAI!',
    ],
  },
];

const TUTORIAL_STORAGE_KEY = 'pai_support_tutorial_completed';

export function SupportUserTutorial() {
  const { user, isSupportUser, isAdmin, isSupervisor } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Only show for support users (not admins or supervisors)
    if (!user || !isSupportUser || isAdmin || isSupervisor) return;

    // Check if tutorial was already completed
    const completed = localStorage.getItem(`${TUTORIAL_STORAGE_KEY}_${user.id}`);
    if (!completed) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isSupportUser, isAdmin, isSupervisor]);

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`${TUTORIAL_STORAGE_KEY}_${user.id}`, 'true');
    }
    setIsOpen(false);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const step = tutorialSteps[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-secondary p-6 pb-12 text-primary-foreground">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-2 text-primary-foreground/80 text-sm mb-2">
            <span>Paso {currentStep + 1} de {tutorialSteps.length}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <StepIcon className="h-8 w-8" />
            </div>
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-xl text-primary-foreground">
                {step.title}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <DialogDescription className="text-base text-foreground leading-relaxed">
            {step.description}
          </DialogDescription>

          {/* Tips */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Consejos
            </h4>
            <ul className="space-y-2">
              {step.tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 pt-2">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentStep
                    ? "w-6 bg-primary"
                    : index < currentStep
                    ? "bg-primary/60"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Omitir tutorial
          </Button>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrev}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button onClick={handleNext} className="min-w-[120px]">
              {isLastStep ? (
                <>
                  ¡Comenzar!
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
      </DialogContent>
    </Dialog>
  );
}

// Export function to manually trigger tutorial
export function resetTutorial(userId: string) {
  localStorage.removeItem(`${TUTORIAL_STORAGE_KEY}_${userId}`);
}

export function showTutorial(userId: string) {
  localStorage.removeItem(`${TUTORIAL_STORAGE_KEY}_${userId}`);
  window.location.reload();
}
