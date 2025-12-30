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
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  X,
  Users,
} from 'lucide-react';
import {
  TicketWithRelations,
  TicketMessage,
  TicketStatusHistory,
  TicketAttachment,
  statusLabels,
  priorityLabels,
  TicketStatus,
  TicketPriority,
} from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import { VoicePlayer } from '@/components/chat/VoicePlayer';
import { MessageStatus } from '@/components/chat/MessageStatus';
import { SatisfactionSurvey } from '@/components/chat/SatisfactionSurvey';
import { OnlineUsers } from '@/components/chat/OnlineUsers';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

interface TicketViewer {
  id: string;
  user_id: string;
  last_seen: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, isAdmin, isSupervisor } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (isAdmin) {
        fetchAdminUsers();
      }

      return () => {
        // Clean up presence when leaving
        if (user) {
          supabase
            .from('ticket_viewers')
            .delete()
            .eq('ticket_id', id)
            .eq('user_id', user.id);
        }
        if (typeof unsubMessages === 'function') unsubMessages();
        if (typeof unsubTicket === 'function') unsubTicket();
        if (typeof unsubViewers === 'function') unsubViewers();
      };
    }
  }, [id, isAdmin]);

  useEffect(() => {
    scrollToBottom();
    markMessagesAsRead();
  }, [messages]);

  // Check if ticket is resolved or closed and show survey
  // Show survey to creator OR to admin (to rate the user)
  useEffect(() => {
    if ((ticket?.status === 'resolved' || ticket?.status === 'closed') && !hasSurvey) {
      const isCreator = ticket.created_by === user?.id;
      const isAssignedAdmin = isAdmin && ticket.assigned_to === user?.id;
      if (isCreator || isAssignedAdmin) {
        setShowSurvey(true);
      }
    }
  }, [ticket?.status, hasSurvey, isAdmin]);

  const checkExistingSurvey = async () => {
    if (!id || !user) return;

    const { data } = await supabase
      .from('satisfaction_surveys')
      .select('id')
      .eq('ticket_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setHasSurvey(true);
    }
  };

  const trackPresence = async () => {
    if (!user || !id) return;

    // Update or insert viewer record
    await supabase
      .from('ticket_viewers')
      .upsert({
        ticket_id: id,
        user_id: user.id,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'ticket_id,user_id'
      });

    // Update presence every 30 seconds
    const interval = setInterval(async () => {
      await supabase
        .from('ticket_viewers')
        .upsert({
          ticket_id: id,
          user_id: user.id,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'ticket_id,user_id'
        });
    }, 30000);

    return () => clearInterval(interval);
  };

  const fetchViewers = async () => {
    if (!id) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('ticket_viewers')
      .select('id, user_id, last_seen')
      .eq('ticket_id', id)
      .gte('last_seen', fiveMinutesAgo);

    if (!error && data) {
      // Fetch profiles for viewers
      const userIds = data.map(v => v.user_id).filter(uid => uid !== user?.id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const viewersWithProfiles = data
          .filter(v => v.user_id !== user?.id)
          .map(v => ({
            ...v,
            profile: profiles?.find(p => p.id === v.user_id)
          }));

        setViewers(viewersWithProfiles as TicketViewer[]);
      } else {
        setViewers([]);
      }
    }
  };

  const subscribeToViewers = () => {
    const channel = supabase
      .channel(`viewers-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_viewers',
          filter: `ticket_id=eq.${id}`,
        },
        () => {
          fetchViewers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async () => {
    if (!user || !id) return;

    // Update messages from others as read
    const unreadMessages = messages.filter(
      m => m.sender_id !== user.id && m.status !== 'read' && !m.is_system_message
    );

    if (unreadMessages.length > 0) {
      await supabase
        .from('ticket_messages')
        .update({ status: 'read' })
        .in('id', unreadMessages.map(m => m.id));
    }
  };

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

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAttachments(data as TicketAttachment[]);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
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
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => 
              prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Subscribe to ticket changes for real-time updates
  const subscribeToTicketChanges = () => {
    const channel = supabase
      .channel(`ticket-updates-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          // Update ticket with new data
          setTicket(prev => prev ? { ...prev, ...payload.new } : prev);
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'Archivo muy grande',
          description: `${file.name} excede el límite de 5MB`,
        });
        return false;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Tipo no permitido',
          description: `${file.name} no es un tipo de archivo permitido`,
        });
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecordingComplete = async (blob: Blob) => {
    if (!user || !id) return;

    setIsSending(true);

    try {
      // Upload voice note
      const fileName = `${id}/${Date.now()}-voice.webm`;
      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Create message with voice note
      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: id,
          sender_id: user.id,
          message: '🎤 Nota de voz',
          is_system_message: false,
          voice_note_url: fileName,
          status: 'sent',
        });

      // Send notification to other party
      await sendNotification('Nuevo mensaje de voz');
    } catch (error) {
      console.error('Error sending voice note:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar la nota de voz',
      });
    } finally {
      setIsSending(false);
    }
  };

  const sendNotification = async (message: string) => {
    if (!ticket) return;

    // Determine recipient
    const recipientId = isAdmin ? ticket.created_by : ticket.assigned_to;
    if (!recipientId || recipientId === user?.id) return;

    await supabase.from('notifications').insert({
      user_id: recipientId,
      title: `Ticket #${ticket.ticket_number}`,
      message,
      type: 'info',
      ticket_id: ticket.id,
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!user) return;

    setIsSending(true);

    // Create message first
    const { data: messageData, error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: id,
        sender_id: user.id,
        message: newMessage.trim() || 'Archivo adjunto',
        is_system_message: false,
        status: 'sent',
      })
      .select()
      .single();

    if (msgError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
      });
      setIsSending(false);
      return;
    }

    // Upload files
    for (const file of selectedFiles) {
      const filePath = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (!uploadError) {
        await supabase.from('ticket_attachments').insert({
          ticket_id: id,
          message_id: messageData.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
        });
      }
    }

    // Send notification
    await sendNotification(newMessage.trim() || 'Nuevo archivo adjunto');

    setNewMessage('');
    setSelectedFiles([]);
    fetchAttachments();
    setIsSending(false);
  };

  const fetchAdminUsers = async () => {
    // Fetch users with admin role
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      setAdminUsers([]);
      return;
    }

    const userIds = adminRoles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)
      .eq('is_active', true);

    if (profiles) {
      setAdminUsers(profiles as AdminUser[]);
    }
  };

  const handleReassign = async (newAssigneeId: string) => {
    if (!ticket || !user) return;
    
    setIsReassigning(true);
    
    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: newAssigneeId === 'unassigned' ? null : newAssigneeId })
      .eq('id', ticket.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo reasignar el ticket',
      });
      setIsReassigning(false);
      return;
    }

    const newAssignee = adminUsers.find(a => a.id === newAssigneeId);

    // Add system message
    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      message: newAssigneeId === 'unassigned' 
        ? 'Ticket sin asignar'
        : `Ticket reasignado a ${newAssignee?.full_name || 'Agente'}`,
      is_system_message: true,
    });

    // Notify new assignee if assigned
    if (newAssigneeId !== 'unassigned' && newAssigneeId !== user.id) {
      await supabase.from('notifications').insert({
        user_id: newAssigneeId,
        title: `Ticket #${ticket.ticket_number} asignado`,
        message: 'Se te ha asignado un nuevo ticket',
        type: 'info',
        ticket_id: ticket.id,
      });
    }

    toast({
      title: 'Ticket reasignado',
      description: newAssigneeId === 'unassigned' 
        ? 'El ticket ha sido desasignado' 
        : `Asignado a ${newAssignee?.full_name || 'Agente'}`,
    });

    setIsReassigning(false);
    fetchTicket();
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

    // Send notification
    if (ticket.created_by && ticket.created_by !== user.id) {
      await supabase.from('notifications').insert({
        user_id: ticket.created_by,
        title: `Ticket #${ticket.ticket_number} actualizado`,
        message: `El estado cambió a "${statusLabels[newStatus]}"`,
        type: newStatus === 'resolved' ? 'success' : 'info',
        ticket_id: ticket.id,
      });
    }

    toast({
      title: 'Estado actualizado',
      description: `El ticket ahora está ${statusLabels[newStatus].toLowerCase()}`,
    });

    fetchTicket();
    fetchHistory();
  };

  const downloadAttachment = async (attachment: TicketAttachment) => {
    const { data, error } = await supabase.storage
      .from('ticket-attachments')
      .download(attachment.file_path);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo descargar el archivo',
      });
      return;
    }

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tickets')} className="self-start">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-mono text-xs sm:text-sm text-muted-foreground">
              #{ticket.ticket_number}
            </span>
            <Badge className={`${getStatusColor(ticket.status)} text-xs`}>
              {statusLabels[ticket.status]}
            </Badge>
            <Badge variant="outline" className={`${getPriorityColor(ticket.priority)} text-xs`}>
              {priorityLabels[ticket.priority]}
            </Badge>
          </div>
          <h1 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-foreground line-clamp-2">{ticket.title}</h1>
          
          {/* Online users */}
          <div className="mt-2">
            <OnlineUsers viewers={viewers} />
          </div>
        </div>
      </div>

      {/* Satisfaction Survey Modal */}
      {showSurvey && (
        <SatisfactionSurvey 
          ticketId={ticket.id} 
          onComplete={() => {
            setShowSurvey(false);
            setHasSurvey(true);
          }} 
        />
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Main Content - Chat */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Description Card */}
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

          {/* Attachments Card */}
          {attachments.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-primary" />
                  Archivos Adjuntos ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="h-10 w-10 flex items-center justify-center bg-background rounded">
                        {getFileIcon(attachment.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadAttachment(attachment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat Section */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Conversación
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {canChat
                  ? 'Comunícate con el equipo de soporte'
                  : 'Historial de la conversación'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {/* Messages */}
              <div className="h-[300px] sm:h-[400px] overflow-y-auto space-y-3 sm:space-y-4 pr-2 scrollbar-thin">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No hay mensajes aún
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    const isSystem = msg.is_system_message;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 sm:px-3 py-1 rounded-full text-center">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 sm:gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                          <AvatarImage src={msg.sender?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs">
                            {msg.sender?.full_name ? getInitials(msg.sender.full_name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-[10px] sm:text-xs font-medium mb-1 opacity-80">
                            {msg.sender?.full_name || 'Usuario'}
                          </p>
                          {msg.voice_note_url ? (
                            <VoicePlayer voiceNoteUrl={msg.voice_note_url} />
                          ) : (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.message}</p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[9px] sm:text-[10px] opacity-60">
                              {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                            </span>
                            {isOwnMessage && msg.status && (
                              <MessageStatus status={msg.status as 'sent' | 'delivered' | 'read'} />
                            )}
                          </div>
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
                  
                  {/* Selected files preview */}
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm"
                        >
                          {getFileIcon(file.type)}
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => removeSelectedFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ALLOWED_FILE_TYPES.join(',')}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <VoiceRecorder 
                        onRecordingComplete={handleVoiceRecordingComplete}
                        disabled={isSending}
                      />
                    </div>
                    <div className="flex gap-2 flex-1">
                      <Textarea
                        placeholder="Escribe tu mensaje..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="min-h-[60px] sm:min-h-[80px] resize-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending}
                        className="self-end flex-shrink-0"
                        size="icon"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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

              {/* Reassign Control (Admin only) */}
              {isAdmin && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Asignar a Agente
                  </label>
                  <Select
                    value={ticket.assigned_to || 'unassigned'}
                    onValueChange={handleReassign}
                    disabled={isReassigning}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin asignar</SelectItem>
                      {adminUsers.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.full_name}
                        </SelectItem>
                      ))}
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
