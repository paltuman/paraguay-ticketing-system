import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/audit';

type AppRole = 'admin' | 'support_user' | 'supervisor' | 'superadmin';

interface ImpersonatedProfile {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  position: string | null;
  avatar_url: string | null;
}

interface ImpersonationState {
  isImpersonating: boolean;
  originalUserId: string | null;
  originalUserName: string | null;
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  impersonatedProfile: ImpersonatedProfile | null;
  impersonatedRoles: AppRole[];
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (
    originalUserId: string,
    originalUserName: string,
    targetUserId: string,
    targetUserName: string
  ) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  getEffectiveUserId: (realUserId: string | undefined) => string | undefined;
  getEffectiveProfile: <T>(realProfile: T | null) => T | ImpersonatedProfile | null;
  getEffectiveRoles: (realRoles: AppRole[]) => AppRole[];
  isEffectiveAdmin: (realIsAdmin: boolean) => boolean;
}

const IMPERSONATION_KEY = 'impersonation_state';

const defaultState: ImpersonationState = {
  isImpersonating: false,
  originalUserId: null,
  originalUserName: null,
  impersonatedUserId: null,
  impersonatedUserName: null,
  impersonatedProfile: null,
  impersonatedRoles: [],
};

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  // Persist state to sessionStorage
  useEffect(() => {
    if (state.isImpersonating) {
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    }
  }, [state]);

  // Fetch impersonated user's profile and roles
  const fetchImpersonatedUserData = async (userId: string): Promise<{
    profile: ImpersonatedProfile | null;
    roles: AppRole[];
  }> => {
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    return {
      profile: profileResult.data as ImpersonatedProfile | null,
      roles: (rolesResult.data?.map(r => r.role) || []) as AppRole[],
    };
  };

  const startImpersonation = useCallback(async (
    originalUserId: string,
    originalUserName: string,
    targetUserId: string,
    targetUserName: string
  ) => {
    const { profile, roles } = await fetchImpersonatedUserData(targetUserId);

    setState({
      isImpersonating: true,
      originalUserId,
      originalUserName,
      impersonatedUserId: targetUserId,
      impersonatedUserName: targetUserName,
      impersonatedProfile: profile,
      impersonatedRoles: roles,
    });

    // Log audit event
    await logAuditEvent({
      action: 'user_impersonation_started',
      entityType: 'user',
      entityId: targetUserId,
      details: {
        target_name: targetUserName,
        target_email: profile?.email,
      },
      userId: originalUserId,
    });
  }, []);

  const stopImpersonation = useCallback(async () => {
    if (state.originalUserId && state.impersonatedUserId) {
      // Log audit event
      await logAuditEvent({
        action: 'user_impersonation_ended',
        entityType: 'user',
        entityId: state.impersonatedUserId,
        details: {
          target_name: state.impersonatedUserName,
        },
        userId: state.originalUserId,
      });
    }

    setState(defaultState);
  }, [state.originalUserId, state.impersonatedUserId, state.impersonatedUserName]);

  // Helper functions for components to get effective user context
  const getEffectiveUserId = useCallback((realUserId: string | undefined) => {
    if (state.isImpersonating && state.impersonatedUserId) {
      return state.impersonatedUserId;
    }
    return realUserId;
  }, [state.isImpersonating, state.impersonatedUserId]);

  const getEffectiveProfile = useCallback(<T,>(realProfile: T | null): T | ImpersonatedProfile | null => {
    if (state.isImpersonating && state.impersonatedProfile) {
      return state.impersonatedProfile;
    }
    return realProfile;
  }, [state.isImpersonating, state.impersonatedProfile]);

  const getEffectiveRoles = useCallback((realRoles: AppRole[]): AppRole[] => {
    if (state.isImpersonating) {
      return state.impersonatedRoles;
    }
    return realRoles;
  }, [state.isImpersonating, state.impersonatedRoles]);

  const isEffectiveAdmin = useCallback((realIsAdmin: boolean): boolean => {
    if (state.isImpersonating) {
      return state.impersonatedRoles.includes('admin') || state.impersonatedRoles.includes('superadmin');
    }
    return realIsAdmin;
  }, [state.isImpersonating, state.impersonatedRoles]);

  return (
    <ImpersonationContext.Provider value={{
      ...state,
      startImpersonation,
      stopImpersonation,
      getEffectiveUserId,
      getEffectiveProfile,
      getEffectiveRoles,
      isEffectiveAdmin,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
