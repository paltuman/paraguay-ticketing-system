import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Send, AlertTriangle } from 'lucide-react';
import { Department, TicketPriority, priorityLabels } from '@/types/database';
import { z } from 'zod';

const ticketSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres').max(200),
  description: z.string().min(20, 'La descripción debe tener al menos 20 caracteres').max(2000),
  department_id: z.string().min(1, 'Selecciona un departamento'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

export default function CreateTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (!error && data) {
      setDepartments(data);
    }
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
