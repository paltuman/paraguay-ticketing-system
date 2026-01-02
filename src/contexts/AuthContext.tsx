import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { auditLogin, auditLogout, auditUserCreated } from '@/lib/audit';

type AppRole = 'admin' | 'support_user' | 'supervisor' | 'superadmin';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  position: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSupervisor: boolean;
  isSupportUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, departmentId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as (Profile & { is_active?: boolean }) | null;
  };

  const checkAndHandleInactiveUser = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', userId)
      .maybeSingle();

    if (profileData && profileData.is_active === false) {
      // User is inactive, sign them out
      await supabase.auth.signOut();
      toast({
        variant: 'destructive',
        title: 'Cuenta inactiva',
        description: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
      });
      return true; // User is inactive
    }
    return false; // User is active
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    return (data?.map(r => r.role) || []) as AppRole[];
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile and roles fetch with setTimeout
        if (session?.user) {
          setTimeout(async () => {
            // Check if user is active first
            const isInactive = await checkAndHandleInactiveUser(session.user.id);
            if (isInactive) {
              setUser(null);
              setSession(null);
              setProfile(null);
              setRoles([]);
              setIsLoading(false);
              return;
            }

            const [profileData, rolesData] = await Promise.all([
              fetchProfile(session.user.id),
              fetchRoles(session.user.id)
            ]);
            setProfile(profileData);
            setRoles(rolesData);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if user is active first
        const isInactive = await checkAndHandleInactiveUser(session.user.id);
        if (isInactive) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
          return;
        }

        const [profileData, rolesData] = await Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id)
        ]);
        setProfile(profileData);
        setRoles(rolesData);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time listener for is_active changes - forces logout when user is deactivated
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          const newProfile = payload.new as { is_active?: boolean };
          
          if (newProfile.is_active === false) {
            // User was deactivated - force logout immediately
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setProfile(null);
            setRoles([]);
            toast({
              variant: 'destructive',
              title: 'Sesión terminada',
              description: 'Tu cuenta ha sido desactivada por un administrador.',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: error.message === 'Invalid login credentials' 
          ? 'Credenciales inválidas. Verifica tu email y contraseña.'
          : error.message,
      });
      return { error };
    }

    // Check if user is active
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileData && profileData.is_active === false) {
        // Sign out the user immediately
        await supabase.auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Cuenta inactiva',
          description: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
        });
        return { error: new Error('User account is inactive') };
      }

      // Log login event
      auditLogin(data.user.id, email);
    }

    toast({
      title: 'Bienvenido',
      description: 'Has iniciado sesión exitosamente.',
    });
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, departmentId?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          department_id: departmentId || null,
        },
      },
    });

    if (error) {
      let message = error.message;
      if (error.message.includes('already registered')) {
        message = 'Este correo electrónico ya está registrado.';
      }
      toast({
        variant: 'destructive',
        title: 'Error al registrarse',
        description: message,
      });
      return { error };
    }

    // Update department_id in profile if provided
    if (data.user && departmentId) {
      await supabase
        .from('profiles')
        .update({ department_id: departmentId })
        .eq('id', data.user.id);
    }

    // Log user created event
    if (data.user) {
      auditUserCreated(data.user.id, email);
    }

    toast({
      title: 'Registro exitoso',
      description: 'Tu cuenta ha sido creada. Ya puedes iniciar sesión.',
    });
    return { error: null };
  };

  const signOut = async () => {
    // Log logout before signing out
    if (user && profile) {
      auditLogout(user.id, profile.email);
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión exitosamente.',
    });
  };

  // Check roles from database only - no hardcoded email bypasses
  const isSuperAdmin = roles.includes('superadmin');
  const isAdmin = roles.includes('admin') || isSuperAdmin;
  const isSupervisor = roles.includes('supervisor');
  const isSupportUser = roles.includes('support_user');

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      isLoading,
      isAdmin,
      isSuperAdmin,
      isSupervisor,
      isSupportUser,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
