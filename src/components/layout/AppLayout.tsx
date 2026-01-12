import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ImpersonationBanner } from './ImpersonationBanner';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import logo from '@/assets/Logo_Subsistema.png';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth();
  const { isImpersonating } = useImpersonation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className={`flex h-screen overflow-hidden bg-background ${isImpersonating ? 'pt-10' : ''}`}>
      <ImpersonationBanner />
      <GuidedTour />
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
        <footer className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Subsistema de Información" className="h-6 w-6 rounded-full" />
              <span className="font-medium">Subsistema de Información</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span>Programa Ampliado de Inmunizaciones</span>
            <span className="hidden sm:inline">•</span>
            <span>© {new Date().getFullYear()} Todos los derechos reservados</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
