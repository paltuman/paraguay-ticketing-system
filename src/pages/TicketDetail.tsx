import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import {
  TicketWithRelations, TicketMessage, TicketStatusHistory, TicketAttachment,
  statusLabels, priorityLabels, TicketStatus, TicketPriority,
} from '@/types/database';
import { SatisfactionSurvey } from '@/components/chat/SatisfactionSurvey';
import { OnlineUsers } from '@/components/chat/OnlineUsers';
import { ChatPanel } from '@/components/ticket-detail/ChatPanel';
import { StatusPanel } from '@/components/ticket-detail/StatusPanel';
import { AttachmentPanel } from '@/components/ticket-detail/AttachmentPanel';
import { HistoryPanel } from '@/components/ticket-detail/HistoryPanel';

interface TicketViewer {
  id: string;
  user_id: string;
  last_seen: string;
  profile?: { full_name: string; avatar_url: string | null };
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isSupervisor } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [history, setHistory] = useState<TicketStatusHistory[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [viewers, setViewers] = useState<TicketViewer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showSurvey, setShowSurvey] = useState(false);
  const [hasSurvey, setHasSurvey] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchMessages();
      fetchHistory();
      fetchAttachments();
      const unsubMessages = subscribeToMessages();
      const unsubTicket = subscribeToTicketChanges();
      trackPresence();
      fetchViewers();
      const unsubViewers = subscribeToViewers();
      checkExistingSurvey();
      if (isAdmin) fetchAdminUsers();

      return () => {
        if (user) {
          supabase.from('ticket_viewers').delete().eq('ticket_id', id).eq('user_id', user.id);
        }
        if (typeof unsubMessages === 'function') unsubMessages();
        if (typeof unsubTicket === 'function') unsubTicket();
        if (typeof unsubViewers === 'function') unsubViewers();
      };
    }
  }, [id, isAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    markMessagesAsRead();
  }, [messages]);

  useEffect(() => {
    if ((ticket?.status === 'resolved' || ticket?.status === 'closed') && !hasSurvey) {
      const isCreator = ticket.created_by === user?.id;
      const isAssignedAdmin = isAdmin && ticket.assigned_to === user?.id;
      if (isCreator || isAssignedAdmin) setShowSurvey(true);
    }
  }, [ticket?.status, hasSurvey, isAdmin]);

  const checkExistingSurvey = async () => {
    if (!id || !user) return;
    const { data } = await supabase.from('satisfaction_surveys').select('id').eq('ticket_id', id).eq('user_id', user.id).maybeSingle();
    if (data) setHasSurvey(true);
  };

  const trackPresence = async () => {
    if (!user || !id) return;
    await supabase.from('ticket_viewers').upsert({ ticket_id: id, user_id: user.id, last_seen: new Date().toISOString() }, { onConflict: 'ticket_id,user_id' });
    const interval = setInterval(async () => {
      await supabase.from('ticket_viewers').upsert({ ticket_id: id, user_id: user.id, last_seen: new Date().toISOString() }, { onConflict: 'ticket_id,user_id' });
    }, 30000);
    return () => clearInterval(interval);
  };

  const fetchViewers = async () => {
    if (!id) return;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('ticket_viewers').select('id, user_id, last_seen').eq('ticket_id', id).gte('last_seen', fiveMinutesAgo);
    if (!error && data) {
      const userIds = data.map(v => v.user_id).filter(uid => uid !== user?.id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
        setViewers(data.filter(v => v.user_id !== user?.id).map(v => ({ ...v, profile: profiles?.find(p => p.id === v.user_id) })) as TicketViewer[]);
      } else {
        setViewers([]);
      }
    }
  };

  const subscribeToViewers = () => {
    const channel = supabase.channel(`viewers-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_viewers', filter: `ticket_id=eq.${id}` }, () => fetchViewers()).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const markMessagesAsRead = async () => {
    if (!user || !id) return;
    const unread = messages.filter(m => m.sender_id !== user.id && m.status !== 'read' && !m.is_system_message);
    if (unread.length > 0) {
      await supabase.from('ticket_messages').update({ status: 'read' }).in('id', unread.map(m => m.id));
    }
  };

  const fetchTicket = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('tickets').select(`*, creator:profiles!tickets_created_by_fkey(id, full_name, email, avatar_url), assignee:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url), department:departments(id, name, description)`).eq('id', id).maybeSingle();
    if (error || !data) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el ticket' }); navigate('/tickets'); return; }
    setTicket(data as unknown as TicketWithRelations);
    setIsLoading(false);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase.from('ticket_messages').select(`*, sender:profiles!ticket_messages_sender_id_fkey(id, full_name, email, avatar_url)`).eq('ticket_id', id).order('created_at', { ascending: true });
    if (!error && data) setMessages(data as unknown as TicketMessage[]);
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase.from('ticket_status_history').select(`*, changer:profiles!ticket_status_history_changed_by_fkey(id, full_name)`).eq('ticket_id', id).order('created_at', { ascending: false });
    if (!error && data) setHistory(data as unknown as TicketStatusHistory[]);
  };

  const fetchAttachments = async () => {
    const { data, error } = await supabase.from('ticket_attachments').select('*').eq('ticket_id', id).order('created_at', { ascending: false });
    if (!error && data) setAttachments(data as TicketAttachment[]);
  };

  const subscribeToMessages = () => {
    const channel = supabase.channel(`ticket-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${id}` }, async (payload) => {
      if (payload.eventType === 'INSERT') {
        const { data } = await supabase.from('ticket_messages').select(`*, sender:profiles!ticket_messages_sender_id_fkey(id, full_name, email, avatar_url)`).eq('id', payload.new.id).single();
        if (data) setMessages(prev => [...prev, data as unknown as TicketMessage]);
      } else if (payload.eventType === 'UPDATE') {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const subscribeToTicketChanges = () => {
    const channel = supabase.channel(`ticket-updates-${id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${id}` }, (payload) => {
      setTicket(prev => prev ? { ...prev, ...payload.new } : prev);
      fetchHistory();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const sendNotification = async (message: string) => {
    if (!ticket) return;
    const recipientId = isAdmin ? ticket.created_by : ticket.assigned_to;
    if (!recipientId || recipientId === user?.id) return;
    await supabase.from('notifications').insert({ user_id: recipientId, title: `Ticket #${ticket.ticket_number}`, message, type: 'info', ticket_id: ticket.id });
  };

  const handleVoiceRecordingComplete = async (blob: Blob) => {
    if (!user || !id) return;
    setIsSending(true);
    try {
      const fileName = `${id}/${Date.now()}-voice.webm`;
      const { error: uploadError } = await supabase.storage.from('voice-notes').upload(fileName, blob);
      if (uploadError) throw uploadError;
      await supabase.from('ticket_messages').insert({ ticket_id: id, sender_id: user.id, message: '🎤 Nota de voz', is_system_message: false, voice_note_url: fileName, status: 'sent' });
      await sendNotification('Nuevo mensaje de voz');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la nota de voz' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!user) return;
    setIsSending(true);
    const { data: messageData, error: msgError } = await supabase.from('ticket_messages').insert({ ticket_id: id, sender_id: user.id, message: newMessage.trim() || 'Archivo adjunto', is_system_message: false, status: 'sent' }).select().single();
    if (msgError) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje' }); setIsSending(false); return; }
    for (const file of selectedFiles) {
      const filePath = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(filePath, file);
      if (!uploadError) {
        await supabase.from('ticket_attachments').insert({ ticket_id: id, message_id: messageData.id, file_name: file.name, file_path: filePath, file_size: file.size, file_type: file.type, uploaded_by: user.id });
      }
    }
    await sendNotification(newMessage.trim() || 'Nuevo archivo adjunto');
    setNewMessage('');
    setSelectedFiles([]);
    fetchAttachments();
    setIsSending(false);
  };

  const fetchAdminUsers = async () => {
    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    if (!adminRoles || adminRoles.length === 0) { setAdminUsers([]); return; }
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', adminRoles.map(r => r.user_id)).eq('is_active', true);
    if (profiles) setAdminUsers(profiles as AdminUser[]);
  };

  const handleReassign = async (newAssigneeId: string) => {
    if (!ticket || !user) return;
    setIsReassigning(true);
    const { error } = await supabase.from('tickets').update({ assigned_to: newAssigneeId === 'unassigned' ? null : newAssigneeId }).eq('id', ticket.id);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reasignar el ticket' }); setIsReassigning(false); return; }
    const newAssignee = adminUsers.find(a => a.id === newAssigneeId);
    await supabase.from('ticket_messages').insert({ ticket_id: ticket.id, sender_id: user.id, message: newAssigneeId === 'unassigned' ? 'Ticket sin asignar' : `Ticket reasignado a ${newAssignee?.full_name || 'Agente'}`, is_system_message: true });
    if (newAssigneeId !== 'unassigned' && newAssigneeId !== user.id) {
      await supabase.from('notifications').insert({ user_id: newAssigneeId, title: `Ticket #${ticket.ticket_number} asignado`, message: 'Se te ha asignado un nuevo ticket', type: 'info', ticket_id: ticket.id });
    }
    toast({ title: 'Ticket reasignado', description: newAssigneeId === 'unassigned' ? 'El ticket ha sido desasignado' : `Asignado a ${newAssignee?.full_name || 'Agente'}` });
    setIsReassigning(false);
    fetchTicket();
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket || !user) return;
    const { error } = await supabase.from('tickets').update({ status: newStatus, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : ticket.resolved_at, closed_at: newStatus === 'closed' ? new Date().toISOString() : ticket.closed_at }).eq('id', ticket.id);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado' }); return; }
    await supabase.from('ticket_status_history').insert({ ticket_id: ticket.id, old_status: ticket.status, new_status: newStatus, changed_by: user.id });
    await supabase.from('ticket_messages').insert({ ticket_id: ticket.id, sender_id: user.id, message: `Estado cambiado de "${statusLabels[ticket.status]}" a "${statusLabels[newStatus]}"`, is_system_message: true });
    if (ticket.created_by && ticket.created_by !== user.id) {
      await supabase.from('notifications').insert({ user_id: ticket.created_by, title: `Ticket #${ticket.ticket_number} actualizado`, message: `El estado cambió a "${statusLabels[newStatus]}"`, type: newStatus === 'resolved' ? 'success' : 'info', ticket_id: ticket.id });
    }
    toast({ title: 'Estado actualizado', description: `El ticket ahora está ${statusLabels[newStatus].toLowerCase()}` });
    fetchTicket();
    fetchHistory();
  };

  const downloadAttachment = async (attachment: TicketAttachment) => {
    const { data, error } = await supabase.storage.from('ticket-attachments').download(attachment.file_path);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo descargar el archivo' }); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    a.click();
    URL.revokeObjectURL(url);
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

  if (!ticket) return null;

  const canChat = !isSupervisor && (isAdmin || ticket.created_by === user?.id);
  const canChangeStatus = isAdmin;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tickets')} className="self-start">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-mono text-xs sm:text-sm text-muted-foreground">#{ticket.ticket_number}</span>
            <Badge className={`${getStatusColor(ticket.status)} text-xs`}>{statusLabels[ticket.status]}</Badge>
            <Badge variant="outline" className={`${getPriorityColor(ticket.priority)} text-xs`}>{priorityLabels[ticket.priority]}</Badge>
          </div>
          <h1 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-foreground line-clamp-2">{ticket.title}</h1>
          <div className="mt-2"><OnlineUsers viewers={viewers} /></div>
        </div>
      </div>

      {showSurvey && (
        <SatisfactionSurvey ticketId={ticket.id} onComplete={() => { setShowSurvey(false); setHasSurvey(true); }} />
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Description */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Descripción del Problema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          <AttachmentPanel attachments={attachments} onDownload={downloadAttachment} />

          <ChatPanel
            ticket={ticket}
            messages={messages}
            userId={user?.id}
            canChat={canChat}
            isSending={isSending}
            newMessage={newMessage}
            selectedFiles={selectedFiles}
            messagesEndRef={messagesEndRef}
            onNewMessageChange={setNewMessage}
            onSendMessage={handleSendMessage}
            onFileChange={(files) => setSelectedFiles(prev => [...prev, ...files])}
            onRemoveFile={(index) => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
            onVoiceRecordingComplete={handleVoiceRecordingComplete}
            onToast={toast}
          />
        </div>

        <div className="space-y-6">
          <StatusPanel
            ticket={ticket}
            canChangeStatus={canChangeStatus}
            isAdmin={isAdmin}
            isReassigning={isReassigning}
            adminUsers={adminUsers}
            onStatusChange={handleStatusChange}
            onReassign={handleReassign}
          />
          <HistoryPanel history={history} />
        </div>
      </div>
    </div>
  );
}
