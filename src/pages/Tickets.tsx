import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  Loader2,
  Ticket as TicketIcon,
  Trash2,
} from 'lucide-react';
import {
  TicketWithRelations,
  Department,
  statusLabels,
  priorityLabels,
  TicketStatus,
  TicketPriority,
} from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function Tickets() {
  const { isAdmin, isSupervisor } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    fetchTickets();
    fetchDepartments();
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_created_by_fkey(id, full_name, email),
        assignee:profiles!tickets_assigned_to_fkey(id, full_name, email),
        department:departments(id, name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data as unknown as TicketWithRelations[]);
    }
    setIsLoading(false);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (!error && data) {
      setDepartments(data);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    setDeletingId(ticketId);
    
    // Delete related records first
    await supabase.from('ticket_attachments').delete().eq('ticket_id', ticketId);
    await supabase.from('ticket_messages').delete().eq('ticket_id', ticketId);
    await supabase.from('ticket_status_history').delete().eq('ticket_id', ticketId);
    
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el ticket: ' + error.message,
      });
    } else {
      toast({
        title: 'Ticket eliminado',
        description: 'El ticket ha sido eliminado correctamente.',
      });
      setTickets(tickets.filter((t) => t.id !== ticketId));
    }
    setDeletingId(null);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toString().includes(searchQuery) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || ticket.department_id === departmentFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesDepartment && matchesPriority;
  });

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open': return 'bg-status-open text-white';
      case 'in_progress': return 'bg-status-in-progress text-white';
      case 'resolved': return 'bg-status-resolved text-white';
      case 'closed': return 'bg-status-closed text-white';
      default: return 'bg-muted';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'low': return 'bg-priority-low/20 text-priority-low border-priority-low';
      case 'medium': return 'bg-priority-medium/20 text-priority-medium border-priority-medium';
      case 'high': return 'bg-priority-high/20 text-priority-high border-priority-high';
      case 'urgent': return 'bg-priority-urgent/20 text-priority-urgent border-priority-urgent';
      default: return 'bg-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isAdmin ? 'Todos los Tickets' : 'Mis Tickets'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Gestiona todos los tickets del sistema'
              : isSupervisor
              ? 'Visualiza las estadísticas de tickets'
              : 'Revisa y gestiona tus solicitudes de soporte'}
          </p>
        </div>
        {!isSupervisor && (
          <Button asChild>
            <Link to="/tickets/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Ticket
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="in_progress">En Proceso</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TicketIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No hay tickets</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all'
                  ? 'No se encontraron tickets con los filtros aplicados'
                  : 'Aún no tienes tickets creados'}
              </p>
              {!isSupervisor && (
                <Button asChild>
                  <Link to="/tickets/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear primer ticket
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className={isAdmin ? 'w-[100px]' : 'w-[50px]'}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <TableCell className="font-mono text-sm">
                      #{ticket.ticket_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[300px]">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {ticket.creator?.full_name || 'Usuario'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ticket.status)}>
                        {statusLabels[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                        {priorityLabels[ticket.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.department?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/tickets/${ticket.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                disabled={deletingId === ticket.id}
                              >
                                {deletingId === ticket.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar ticket #{ticket.ticket_number}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminarán todos los mensajes y archivos adjuntos asociados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTicket(ticket.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
