import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, KeyRound } from 'lucide-react';
import { z } from 'zod';
import logo from '@/assets/logo-pai-circular.png';
import { auditPasswordChange } from '@/lib/audit';

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      console.log('Checking reset password session...');
      console.log('Current URL:', window.location.href);
      console.log('Hash:', window.location.hash);
      console.log('Search params:', window.location.search);
      
      // Check for access_token in URL hash (Supabase recovery flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');
      
      // Also check URL search params (some hosting services use query params)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromQuery = urlParams.get('access_token') || urlParams.get('token');
      const typeFromQuery = urlParams.get('type');
      
      console.log('Token from hash:', accessToken ? 'exists' : 'none');
      console.log('Type from hash:', type);
      console.log('Token from query:', tokenFromQuery ? 'exists' : 'none');
      console.log('Error:', errorCode, errorDescription);
      
      // Handle error in URL
      if (errorCode || errorDescription) {
        console.error('Error in URL:', errorCode, errorDescription);
        setIsValidToken(false);
        toast({
          variant: 'destructive',
          title: 'Enlace inválido',
          description: errorDescription || 'El enlace de recuperación ha expirado o es inválido.',
        });
        return;
      }
      
      if ((type === 'recovery' || typeFromQuery === 'recovery') && (accessToken || tokenFromQuery)) {
        const token = accessToken || tokenFromQuery;
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token') || '';
        
        console.log('Setting session with recovery token...');
        
        // Set the session from the recovery token
        const { error } = await supabase.auth.setSession({
          access_token: token!,
          refresh_token: refreshToken,
        });
        
        if (error) {
          console.error('Error setting session:', error);
          setIsValidToken(false);
          toast({
            variant: 'destructive',
            title: 'Enlace inválido',
            description: 'El enlace de recuperación ha expirado o es inválido.',
          });
        } else {
          console.log('Session set successfully');
          setIsValidToken(true);
        }
      } else {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Existing session:', session ? 'exists' : 'none');
        
        if (session) {
          // User might have a valid session from clicking the email link
          setIsValidToken(true);
        } else {
          // No valid token or session
          console.log('No valid token or session found');
          setIsValidToken(false);
        }
      }
    };

    // Listen for auth state changes (important for cross-domain redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session ? 'has session' : 'no session');
      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsValidToken(true);
      }
    });

    checkSession();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate passwords
    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        // Log password change
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          auditPasswordChange(user.id, user.email || '');
        }
        
        setIsSuccess(true);
        toast({
          title: 'Contraseña actualizada',
          description: 'Tu contraseña ha sido restablecida exitosamente.',
        });

        // Sign out and redirect to login after 3 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/auth');
        }, 3000);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un problema al actualizar la contraseña.',
      });
    }

    setIsSubmitting(false);
  };

  // Loading state
  if (isValidToken === null) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero p-4">
        <Card className="w-full max-w-md animate-fade-in border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <img src={logo} alt="PAI" className="mx-auto mb-4 h-16 w-16 rounded-full" />
            <CardTitle className="text-2xl font-bold text-destructive">Enlace Inválido</CardTitle>
            <CardDescription>
              El enlace de recuperación ha expirado o es inválido. Por favor, solicita un nuevo enlace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Volver al Inicio de Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero p-4">
        <Card className="w-full max-w-md animate-fade-in border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-resolved/20">
              <CheckCircle2 className="h-8 w-8 text-status-resolved" />
            </div>
            <CardTitle className="text-2xl font-bold text-status-resolved">¡Contraseña Actualizada!</CardTitle>
            <CardDescription>
              Tu contraseña ha sido restablecida exitosamente. Serás redirigido al inicio de sesión...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero p-4">
      <Card className="w-full max-w-md animate-fade-in border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Restablecer Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu nueva contraseña para tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                La contraseña debe tener:
              </p>
              <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                <li>Al menos 8 caracteres</li>
                <li>Una letra mayúscula</li>
                <li>Una letra minúscula</li>
                <li>Un número</li>
                <li>Un carácter especial (!@#$%^&*)</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Restablecer Contraseña'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              Cancelar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}