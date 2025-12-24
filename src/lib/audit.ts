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
    // Use the secure insert_audit_log function instead of direct insert
    const { error } = await supabase.rpc('insert_audit_log', {
      _action: action,
      _entity_type: entityType,
      _entity_id: entityId || null,
      _details: details || null,
      _user_id: userId || null,
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
