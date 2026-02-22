import { useState, useEffect, useCallback, memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RippleButton } from '@/components/ui/RippleButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Building2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { z } from 'zod';
import logo from '@/assets/logo-pai-circular.png';
import { Department } from '@/types/database';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Correo electrónico inválido').max(255),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  confirmPassword: z.string(),
  departmentId: z.string().min(1, 'Selecciona un departamento'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export default function Auth() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Department[]>([]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupDepartmentId, setSignupDepartmentId] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (!error && data) {
      setDepartments(data);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ingresa un correo electrónico válido',
      });
      return;
    }

    setIsResetting(true);
    
    try {
      // Use current origin - works for Firebase, Vercel, Cloudflare, etc.
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/reset-password`;
      
      console.log('Password reset redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error);
        // Handle rate limit error
        if (error.message.includes('rate_limit') || error.message.includes('after') || error.status === 429) {
          toast({
            variant: 'destructive',
            title: 'Demasiadas solicitudes',
            description: 'Por favor espera unos segundos antes de intentar nuevamente.',
          });
        } else if (error.message.includes('User not found') || error.message.includes('not found')) {
          toast({
            variant: 'destructive',
            title: 'Correo no registrado',
            description: 'Este correo no está registrado en el sistema. Verifica e intenta nuevamente.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message,
          });
        }
      } else {
        toast({
          title: 'Correo enviado',
          description: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (err) {
      console.error('Password reset exception:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un problema al enviar el correo. Intenta nuevamente.',
      });
    }
    
    setIsResetting(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gradient-hero">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
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
    await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signupSchema.parse({
        fullName: signupFullName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        departmentId: signupDepartmentId,
      });
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
    const result = await signUp(signupEmail, signupPassword, signupFullName, signupDepartmentId);
    setIsSubmitting(false);

    if (!result.error) {
      // Clear form and switch to login
      setSignupFullName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setSignupDepartmentId('');
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>
        
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/20 animate-particle"
              style={{
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 10 + 10}s`,
              }}
            />
          ))}
          {/* Sparkle elements */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute animate-sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="opacity-40">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </div>
          ))}
        </div>
        
        <div className="text-center relative z-10 animate-fade-in">
          <div className="mx-auto mb-10 h-56 w-56 rounded-full bg-white/95 p-3 shadow-glow flex items-center justify-center backdrop-blur-sm">
            <img 
              src={logo} 
              alt="Programa Ampliado de Inmunizaciones" 
              className="h-48 w-48 object-contain" 
            />
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight">Programa Ampliado de Inmunizaciones</h1>
          <p className="text-xl opacity-90">Sistema de Gestión de Tickets</p>
        </div>
        <div className="absolute bottom-8 text-center">
          <p className="text-xs opacity-40">© {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex w-full items-center justify-center bg-background p-4 sm:p-8 lg:w-1/2">
        <Card className="w-full max-w-md animate-fade-in border shadow-lg">
          <CardHeader className="space-y-1 pb-2">
            <img src={logo} alt="PAI" className="mx-auto mb-4 h-20 w-20 rounded-full lg:hidden" />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="text-sm font-medium">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm font-medium">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="text-xs px-0 h-auto text-muted-foreground hover:text-primary"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                  <RippleButton type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ingresando...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </RippleButton>
                </form>

                {/* Forgot Password Dialog */}
                <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recuperar Contraseña</DialogTitle>
                      <DialogDescription>
                        Ingresa el correo electrónico con el que te registraste y te enviaremos un enlace para restablecer tu contraseña.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Correo Electrónico Registrado</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Solo se enviará el enlace si el correo está registrado en el sistema.
                        </p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isResetting}>
                          {isResetting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            'Enviar Enlace'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 pt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={signupFullName}
                        onChange={(e) => setSignupFullName(e.target.value)}
                        className={`pl-10 pr-10 ${signupFullName.length >= 2 ? 'border-green-500 focus-visible:ring-green-500' : ''} ${errors.fullName ? 'border-destructive' : ''}`}
                        required
                      />
                      {signupFullName.length >= 2 && (
                        <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                    {errors.fullName && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.fullName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className={`pl-10 pr-10 ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail) ? 'border-green-500 focus-visible:ring-green-500' : ''} ${errors.email ? 'border-destructive' : ''}`}
                        required
                      />
                      {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail) && (
                        <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-department">Departamento</Label>
                    <Select value={signupDepartmentId} onValueChange={setSignupDepartmentId}>
                      <SelectTrigger className={errors.departmentId ? 'border-destructive' : ''}>
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Selecciona tu departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.departmentId && (
                      <p className="text-xs text-destructive">{errors.departmentId}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                    <PasswordStrengthIndicator password={signupPassword} />
                    {errors.password && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type={showSignupConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className={`pl-10 pr-16 ${signupConfirmPassword && signupConfirmPassword === signupPassword ? 'border-green-500 focus-visible:ring-green-500' : ''} ${errors.confirmPassword ? 'border-destructive' : ''}`}
                        required
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {signupConfirmPassword && signupConfirmPassword === signupPassword && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        >
                          {showSignupConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {signupConfirmPassword && signupConfirmPassword !== signupPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Las contraseñas no coinciden
                      </p>
                    )}
                    {errors.confirmPassword && !signupConfirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                  <RippleButton type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </RippleButton>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}