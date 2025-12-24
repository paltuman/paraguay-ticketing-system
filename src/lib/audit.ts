import { supabase } from '@/integrations/supabase/client';

interface AuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  userId?: string;
}

export async function logAuditEvent({
  action,
  entityType,
  entityId,
  details,
  userId,
}: AuditLogParams): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    if (error) {
      console.error('Error logging audit event:', error);
    }
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

// Convenience functions for common actions
export const auditLogin = (userId: string, email: string) =>
  logAuditEvent({
    action: 'login',
    entityType: 'auth',
    entityId: userId,
    details: { email },
    userId,
  });

export const auditLogout = (userId: string, email: string) =>
  logAuditEvent({
    action: 'logout',
    entityType: 'auth',
    entityId: userId,
    details: { email },
    userId,
  });

export const auditPasswordChange = (userId: string, email: string) =>
  logAuditEvent({
    action: 'password_change',
    entityType: 'auth',
    entityId: userId,
    details: { email },
    userId,
  });

export const auditPasswordReset = (userId: string, email: string) =>
  logAuditEvent({
    action: 'password_reset',
    entityType: 'auth',
    entityId: userId,
    details: { email },
    userId,
  });

export const auditUserCreated = (userId: string, email: string, createdBy?: string) =>
  logAuditEvent({
    action: 'user_created',
    entityType: 'user',
    entityId: userId,
    details: { email },
    userId: createdBy || userId,
  });

export const auditRoleChanged = (
  userId: string,
  email: string,
  oldRole: string,
  newRole: string,
  changedBy: string
) =>
  logAuditEvent({
    action: 'role_changed',
    entityType: 'user',
    entityId: userId,
    details: { email, oldRole, newRole },
    userId: changedBy,
  });