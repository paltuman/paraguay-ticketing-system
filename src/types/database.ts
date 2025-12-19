export type AppRole = 'admin' | 'support_user' | 'supervisor' | 'superadmin';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  position: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string | null;
  assigned_to: string | null;
  department_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface TicketWithRelations extends Ticket {
  creator?: Profile | null;
  assignee?: Profile | null;
  department?: Department | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  message: string;
  is_system_message: boolean;
  status?: 'sent' | 'delivered' | 'read';
  voice_note_url?: string | null;
  created_at: string;
  sender?: Profile | null;
}

export interface TicketStatusHistory {
  id: string;
  ticket_id: string;
  old_status: TicketStatus | null;
  new_status: TicketStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  changer?: Profile | null;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface CommonIssue {
  id: string;
  title: string;
  description: string | null;
  department_id: string | null;
  keywords: string[];
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export const statusLabels: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En Proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  support_user: 'Usuario de Soporte',
  supervisor: 'Supervisor',
  superadmin: 'Super Administrador',
};
