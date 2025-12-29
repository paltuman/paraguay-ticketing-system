import { useState, useEffect, useCallback } from 'react';

interface ImpersonationState {
  isImpersonating: boolean;
  originalUserId: string | null;
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
}

const IMPERSONATION_KEY = 'impersonation_state';

export function useImpersonation() {
  const [state, setState] = useState<ImpersonationState>(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {
          isImpersonating: false,
          originalUserId: null,
          impersonatedUserId: null,
          impersonatedUserName: null,
        };
      }
    }
    return {
      isImpersonating: false,
      originalUserId: null,
      impersonatedUserId: null,
      impersonatedUserName: null,
    };
  });

  useEffect(() => {
    if (state.isImpersonating) {
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    }
  }, [state]);

  const startImpersonation = useCallback((
    originalUserId: string,
    targetUserId: string,
    targetUserName: string
  ) => {
    setState({
      isImpersonating: true,
      originalUserId,
      impersonatedUserId: targetUserId,
      impersonatedUserName: targetUserName,
    });
  }, []);

  const stopImpersonation = useCallback(() => {
    setState({
      isImpersonating: false,
      originalUserId: null,
      impersonatedUserId: null,
      impersonatedUserName: null,
    });
  }, []);

  return {
    ...state,
    startImpersonation,
    stopImpersonation,
  };
}
