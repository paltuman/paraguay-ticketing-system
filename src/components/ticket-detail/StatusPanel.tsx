import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Clock, User, Building2, Users } from 'lucide-react';
import { TicketWithRelations, statusLabels, TicketStatus } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface StatusPanelProps {
  ticket: TicketWithRelations;
  canChangeStatus: boolean;
  isAdmin: boolean;
  isReassigning: boolean;
  adminUsers: AdminUser[];
  onStatusChange: (status: TicketStatus) => void;
  onReassign: (assigneeId: string) => void;
}

export function StatusPanel({
  ticket, canChangeStatus, isAdmin, isReassigning, adminUsers,
  onStatusChange, onReassign,
}: StatusPanelProps) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle>Detalles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canChangeStatus && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Cambiar Estado</label>
            <Select value={ticket.status} onValueChange={(v) => onStatusChange(v as TicketStatus)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="in_progress">En Proceso</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isAdmin && (
          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Asignar a Agente
            </label>
            <Select value={ticket.assigned_to || 'unassigned'} onValueChange={onReassign} disabled={isReassigning}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {adminUsers.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>{admin.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Creado por</p>
            <p className="text-sm font-medium">{ticket.creator?.full_name || 'Usuario'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Departamento</p>
            <p className="text-sm font-medium">{ticket.department?.name || '-'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Fecha de creación</p>
            <p className="text-sm font-medium">
              {format(new Date(ticket.created_at), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
