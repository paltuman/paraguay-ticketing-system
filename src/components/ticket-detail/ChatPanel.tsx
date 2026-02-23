import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Send,
  MessageSquare,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { TicketMessage, TicketWithRelations } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import { VoicePlayer } from '@/components/chat/VoicePlayer';
import { MessageStatus } from '@/components/chat/MessageStatus';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

interface ChatPanelProps {
  ticket: TicketWithRelations;
  messages: TicketMessage[];
  userId: string | undefined;
  canChat: boolean;
  isSending: boolean;
  newMessage: string;
  selectedFiles: File[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onNewMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onFileChange: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onVoiceRecordingComplete: (blob: Blob) => void;
  onToast: (opts: { variant?: 'destructive'; title: string; description: string }) => void;
}

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const getFileIcon = (type: string) =>
  type.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />;

export function ChatPanel({
  ticket, messages, userId, canChat, isSending, newMessage, selectedFiles,
  messagesEndRef, onNewMessageChange, onSendMessage, onFileChange, onRemoveFile,
  onVoiceRecordingComplete, onToast,
}: ChatPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        onToast({ variant: 'destructive', title: 'Archivo muy grande', description: `${file.name} excede el límite de 5MB` });
        return false;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        onToast({ variant: 'destructive', title: 'Tipo no permitido', description: `${file.name} no es un tipo de archivo permitido` });
        return false;
      }
      return true;
    });
    onFileChange(validFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Conversación
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {canChat ? 'Comunícate con el equipo de soporte' : 'Historial de la conversación'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="h-[300px] sm:h-[400px] overflow-y-auto space-y-3 sm:space-y-4 pr-2 scrollbar-thin">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No hay mensajes aún</p>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.sender_id === userId;
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
                <div key={msg.id} className={`flex gap-2 sm:gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarImage src={msg.sender?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs">
                      {msg.sender?.full_name ? getInitials(msg.sender.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] sm:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 ${isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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

        {canChat && ticket.status !== 'closed' && (
          <>
            <Separator className="my-4" />
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm">
                    {getFileIcon(file.type)}
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onRemoveFile(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" multiple accept={ALLOWED_FILE_TYPES.join(',')} onChange={handleFileChange} className="hidden" />
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="flex-shrink-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <VoiceRecorder onRecordingComplete={onVoiceRecordingComplete} disabled={isSending} />
              </div>
              <div className="flex gap-2 flex-1">
                <Textarea
                  placeholder="Escribe tu mensaje..."
                  value={newMessage}
                  onChange={(e) => onNewMessageChange(e.target.value)}
                  className="min-h-[60px] sm:min-h-[80px] resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); }
                  }}
                />
                <Button onClick={onSendMessage} disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending} className="self-end flex-shrink-0" size="icon">
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}

        {ticket.status === 'closed' && (
          <div className="mt-4 p-4 rounded-lg bg-muted text-center">
            <p className="text-muted-foreground">Este ticket está cerrado. No se pueden enviar más mensajes.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
