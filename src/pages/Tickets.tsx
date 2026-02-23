import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import {
  PlusCircle, Search, Filter, ArrowRight, Loader2, Ticket as TicketIcon, Trash2,
} from 'lucide-react';
import {
  TicketWithRelations, Department, statusLabels, priorityLabels, TicketStatus, TicketPriority,
} from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const TICKETS_PER_PAGE = 15;

interface Agent {
  id: string;
  full_name: string;
}

export default function Tickets() {
  const { isAdmin, isSupervisor } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  useEffect(() => {
    fetchTickets();
    fetchDepartments();
    if (isAdmin) fetchAgents();
  }, [isAdmin]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, departmentFilter, priorityFilter, agentFilter]);

  const fetchTickets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select(`*, creator:profiles!tickets_created_by_fkey(id, full_name, email), assignee:profiles!tickets_assigned_to_fkey(id, full_name, email), department:departments(id, name)`)
      .order('created_at', { ascending: false });
    if (!error && data) setTickets(data as unknown as TicketWithRelations[]);
    setIsLoading(false);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (!error && data) setDepartments(data);
  };

  const fetchAgents = async () => {
    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    if (!adminRoles || adminRoles.length === 0) { setAgents([]); return; }
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', adminRoles.map(r => r.user_id)).eq('is_active', true).order('full_name');
    if (profiles) setAgents(profiles as Agent[]);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    setDeletingId(ticketId);
    // CASCADE handles related records automatically now
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el ticket: ' + error.message });
    } else {
      toast({ title: 'Ticket eliminado', description: 'El ticket ha sido eliminado correctamente.' });
      setTickets(tickets.filter((t) => t.id !== ticketId));
    }
    setDeletingId(null);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) || ticket.ticket_number.toString().includes(searchQuery) || ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || ticket.department_id === departmentFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesAgent = agentFilter === 'all' ? true : agentFilter === 'unassigned' ? !ticket.assigned_to : ticket.assigned_to === agentFilter;
    return matchesSearch && matchesStatus && matchesDepartment && matchesPriority && matchesAgent;
  });

  const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * TICKETS_PER_PAGE, currentPage * TICKETS_PER_PAGE);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            {isAdmin ? 'Todos los Tickets' : 'Mis Tickets'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isAdmin ? 'Gestiona todos los tickets del sistema' : isSupervisor ? 'Visualiza las estadísticas de tickets' : 'Revisa y gestiona tus solicitudes de soporte'}
          </p>
        </div>
        {!isSupervisor && (
          <Button asChild className="w-full sm:w-auto">
            <Link to="/tickets/new"><PlusCircle className="mr-2 h-4 w-4" />Crear Ticket</Link>
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar tickets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="in_progress">En Proceso</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments.map((dept) => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger><SelectValue placeholder="Agente asignado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los agentes</SelectItem>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {agents.map((agent) => (<SelectItem key={agent.id} value={agent.id}>{agent.full_name}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TicketIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No hay tickets</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' ? 'No se encontraron tickets con los filtros aplicados' : 'Aún no tienes tickets creados'}
              </p>
              {!isSupervisor && (
                <Button asChild><Link to="/tickets/new"><PlusCircle className="mr-2 h-4 w-4" />Crear primer ticket</Link></Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Número</TableHead>
                      <TableHead className="min-w-[150px]">Título</TableHead>
                      <TableHead className="w-[100px]">Estado</TableHead>
                      <TableHead className="hidden sm:table-cell w-[100px]">Prioridad</TableHead>
                      <TableHead className="hidden md:table-cell">Departamento</TableHead>
                      <TableHead className="hidden lg:table-cell w-[100px]">Fecha</TableHead>
                      <TableHead className={isAdmin ? 'w-[80px]' : 'w-[50px]'}></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                        <TableCell className="font-mono text-xs sm:text-sm">#{ticket.ticket_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-[150px] sm:max-w-[300px] text-sm">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[300px]">{ticket.creator?.full_name || 'Usuario'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(ticket.status)} text-[10px] sm:text-xs`}>{statusLabels[ticket.status]}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={`${getPriorityColor(ticket.priority)} text-[10px] sm:text-xs`}>{priorityLabels[ticket.priority]}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{ticket.department?.name || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <Link to={`/tickets/${ticket.id}`}><ArrowRight className="h-4 w-4" /></Link>
                            </Button>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" disabled={deletingId === ticket.id}>
                                    {deletingId === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar ticket #{ticket.ticket_number}?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán todos los mensajes y archivos adjuntos asociados.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTicket(ticket.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
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
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * TICKETS_PER_PAGE + 1}-{Math.min(currentPage * TICKETS_PER_PAGE, filteredTickets.length)} de {filteredTickets.length}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((page, i) =>
                        page === 'ellipsis' ? (
                          <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink isActive={currentPage === page} onClick={() => setCurrentPage(page)} className="cursor-pointer">
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
