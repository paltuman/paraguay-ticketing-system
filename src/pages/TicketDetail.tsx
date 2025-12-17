import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  Send,
  Clock,
  User,
  Building2,
  AlertCircle,
  MessageSquare,
  History,
} from 'lucide-react';
import {
  TicketWithRelations,
  TicketMessage,
  TicketStatusHistory,
  statusLabels,
  priorityLabels,
  TicketStatus,
  TicketPriority,
} from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, isAdmin, isSupervisor } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [history, setHistory] = useState<TicketStatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchMessages();
      fetchHistory();
      subscribeToMessages();
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicket = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_created_by_fkey(id, full_name, email, avatar_url),
        assignee:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
        department:departments(id, name, description)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el ticket',
      });
      navigate('/tickets');
      return;
    }

    setTicket(data as unknown as TicketWithRelations);
    setIsLoading(false);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles!ticket_messages_sender_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as unknown as TicketMessage[]);
    }
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('ticket_status_history')
      .select(`
        *,
        changer:profiles!ticket_status_history_changed_by_fkey(id, full_name)
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setHistory(data as unknown as TicketStatusHistory[]);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('ticket_messages')
            .select(`
              *,
              sender:profiles!ticket_messages_sender_id_fkey(id, full_name, email, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as unknown as TicketMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: id,
      sender_id: user.id,
      message: newMessage.trim(),
      is_system_message: false,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
      });
    } else {
      setNewMessage('');
    }
    setIsSending(false);
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket || !user) return;

    const { error } = await supabase
      .from('tickets')
      .update({
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : ticket.resolved_at,
        closed_at: newStatus === 'closed' ? new Date().toISOString() : ticket.closed_at,
      })
      .eq('id', ticket.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado',
      });
      return;
    }

    // Add to history
    await supabase.from('ticket_status_history').insert({
      ticket_id: ticket.id,
      old_status: ticket.status,
      new_status: newStatus,
      changed_by: user.id,
    });

    // Add system message
    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      message: `Estado cambiado de "${statusLabels[ticket.status]}" a "${statusLabels[newStatus]}"`,
      is_system_message: true,
    });

    toast({
      title: 'Estado actualizado',
      description: `El ticket ahora está ${statusLabels[newStatus].toLowerCase()}`,
    });

    fetchTicket();
    fetchHistory();
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const canChat = !isSupervisor && (isAdmin || ticket.created_by === user?.id);
  const canChangeStatus = isAdmin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tickets')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">
              #{ticket.ticket_number}
            </span>
            <Badge className={getStatusColor(ticket.status)}>
              {statusLabels[ticket.status]}
            </Badge>
            <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
              {priorityLabels[ticket.priority]}
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Chat */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Descripción del Problema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Conversación
              </CardTitle>
              <CardDescription>
                {canChat
                  ? 'Comunícate con el equipo de soporte'
                  : 'Historial de la conversación'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Messages */}
              <div className="h-[400px] overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay mensajes aún
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    const isSystem = msg.is_system_message;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={msg.sender?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {msg.sender?.full_name ? getInitials(msg.sender.full_name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-xs font-medium mb-1 opacity-80">
                            {msg.sender?.full_name || 'Usuario'}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-[10px] opacity-60 mt-1 text-right">
                            {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {canChat && ticket.status !== 'closed' && (
                <>
                  <Separator className="my-4" />
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Escribe tu mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="self-end"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}

              {ticket.status === 'closed' && (
                <div className="mt-4 p-4 rounded-lg bg-muted text-center">
                  <p className="text-muted-foreground">
                    Este ticket está cerrado. No se pueden enviar más mensajes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Control (Admin only) */}
              {canChangeStatus && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Cambiar Estado
                  </label>
                  <Select
                    value={ticket.status}
                    onValueChange={(v) => handleStatusChange(v as TicketStatus)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Abierto</SelectItem>
                      <SelectItem value="in_progress">En Proceso</SelectItem>
                      <SelectItem value="resolved">Resuelto</SelectItem>
                      <SelectItem value="closed">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              {/* Creator */}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Creado por</p>
                  <p className="text-sm font-medium">{ticket.creator?.full_name || 'Usuario'}</p>
                </div>
              </div>

              {/* Department */}
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Departamento</p>
                  <p className="text-sm font-medium">{ticket.department?.name || '-'}</p>
                </div>
              </div>

              {/* Created At */}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de creación</p>
                  <p className="text-sm font-medium">
                    {format(new Date(ticket.created_at), "dd 'de' MMMM, yyyy HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin cambios registrados</p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 text-sm border-l-2 border-primary/20 pl-3"
                    >
                      <div>
                        <p className="font-medium">
                          {item.old_status
                            ? `${statusLabels[item.old_status]} → ${statusLabels[item.new_status]}`
                            : statusLabels[item.new_status]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.changer?.full_name || 'Sistema'} •{' '}
                          {format(new Date(item.created_at), 'dd MMM HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
