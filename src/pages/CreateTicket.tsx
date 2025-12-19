import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Send, AlertTriangle, Paperclip, X, Lightbulb, FileText, Image as ImageIcon } from 'lucide-react';
import { Department, TicketPriority, priorityLabels, CommonIssue } from '@/types/database';
import { z } from 'zod';

const ticketSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres').max(200),
  description: z.string().min(20, 'La descripción debe tener al menos 20 caracteres').max(2000),
  department_id: z.string().min(1, 'Selecciona un departamento'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

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

interface FileWithPreview {
  file: File;
  preview?: string;
}

export default function CreateTicket() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [commonIssues, setCommonIssues] = useState<CommonIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(profile?.department_id || '');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
    fetchCommonIssues();
    // Pre-select user's department
    if (profile?.department_id) {
      setDepartmentId(profile.department_id);
    }
  }, [profile]);

  useEffect(() => {
    // Filter common issues when department changes
    fetchCommonIssues();
  }, [departmentId]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchCommonIssues = async () => {
    let query = supabase
      .from('common_issues')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .limit(10);

    if (departmentId) {
      query = query.or(`department_id.eq.${departmentId},department_id.is.null`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setCommonIssues(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const validFiles: FileWithPreview[] = [];
    
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'Archivo muy grande',
          description: `${file.name} excede el límite de 5MB`,
        });
        continue;
      }
      
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Tipo de archivo no permitido',
          description: `${file.name} no es un tipo de archivo permitido`,
        });
        continue;
      }
      
      const fileWithPreview: FileWithPreview = { file };
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      validFiles.push(fileWithPreview);
    }
    
    setFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const selectCommonIssue = async (issue: CommonIssue) => {
    setSelectedIssueId(issue.id);
    setTitle(issue.title);
    if (issue.description) {
      setDescription(issue.description);
    }

    // Increment usage count
    await supabase
      .from('common_issues')
      .update({ usage_count: issue.usage_count + 1 })
      .eq('id', issue.id);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      ticketSchema.parse({
        title,
        description,
        department_id: departmentId,
        priority,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        title,
        description,
        department_id: departmentId,
        priority,
        created_by: user?.id,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al crear ticket',
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    // Upload files
    for (const fileWithPreview of files) {
      const file = fileWithPreview.file;
      const filePath = `${data.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (!uploadError) {
        await supabase.from('ticket_attachments').insert({
          ticket_id: data.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
        });
      }
    }

    // Add initial message to ticket
    await supabase.from('ticket_messages').insert({
      ticket_id: data.id,
      sender_id: user?.id,
      message: description,
      is_system_message: false,
    });

    // Add status history
    await supabase.from('ticket_status_history').insert({
      ticket_id: data.id,
      new_status: 'open',
      changed_by: user?.id,
      notes: 'Ticket creado',
    });

    toast({
      title: 'Ticket creado',
      description: `Tu ticket #${data.ticket_number} ha sido creado exitosamente.`,
    });

    navigate(`/tickets/${data.id}`);
  };

  const priorityOptions: { value: TicketPriority; label: string; description: string }[] = [
    { value: 'low', label: 'Baja', description: 'Consultas generales, sin urgencia' },
    { value: 'medium', label: 'Media', description: 'Problemas que necesitan atención regular' },
    { value: 'high', label: 'Alta', description: 'Problemas importantes que requieren pronta atención' },
    { value: 'urgent', label: 'Urgente', description: 'Emergencias que requieren atención inmediata' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Crear Ticket</h1>
          <p className="text-muted-foreground">
            Describe tu problema o solicitud de soporte
          </p>
        </div>
      </div>

      {/* Common Issues Suggestions */}
      {commonIssues.length > 0 && (
        <Card className="border-0 shadow-md bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Problemas Frecuentes
            </CardTitle>
            <CardDescription className="text-xs">
              Selecciona si tu problema coincide con alguno de estos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {commonIssues.map((issue) => (
                <Badge
                  key={issue.id}
                  variant={selectedIssueId === issue.id ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => selectCommonIssue(issue)}
                >
                  {issue.title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Nueva Solicitud de Soporte</CardTitle>
          <CardDescription>
            Completa los campos para crear un nuevo ticket. Nuestro equipo te responderá lo antes posible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título del Ticket *</Label>
              <Input
                id="title"
                placeholder="Ej: Error al acceder al sistema de vacunas"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Departamento *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className={errors.department_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecciona el departamento relacionado" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department_id && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.department_id}
                </p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad *</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción Detallada *</Label>
              <Textarea
                id="description"
                placeholder="Describe detalladamente tu problema o solicitud. Incluye cualquier información relevante como pasos para reproducir el error, mensajes de error, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`min-h-[150px] ${errors.description ? 'border-destructive' : ''}`}
              />
              {errors.description && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {description.length}/2000 caracteres
              </p>
            </div>

            {/* File Attachments */}
            <div className="space-y-2">
              <Label>Archivos Adjuntos (opcional)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="text-center">
                  <Paperclip className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2"
                  >
                    Seleccionar archivos
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imágenes, PDF, documentos Word/Excel. Máximo 5MB por archivo.
                  </p>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2 mt-3">
                  {files.map((fileWithPreview, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                    >
                      {fileWithPreview.preview ? (
                        <img
                          src={fileWithPreview.preview}
                          alt={fileWithPreview.file.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center bg-background rounded">
                          {getFileIcon(fileWithPreview.file.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {fileWithPreview.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileWithPreview.file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Crear Ticket
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
