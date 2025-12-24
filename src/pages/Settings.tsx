import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Settings as SettingsIcon,
  Building2,
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Bell,
  Shield,
  Mail,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Department, CommonIssue } from '@/types/database';

export default function Settings() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [commonIssues, setCommonIssues] = useState<CommonIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Department form state
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Common issue form state
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<CommonIssue | null>(null);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueDepartmentId, setIssueDepartmentId] = useState('');
  const [issueKeywords, setIssueKeywords] = useState('');
  const [issueActive, setIssueActive] = useState(true);
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchDepartments(), fetchCommonIssues()]);
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

  const fetchCommonIssues = async () => {
    const { data, error } = await supabase
      .from('common_issues')
      .select('*, department:departments(id, name)')
      .order('usage_count', { ascending: false });

    if (!error && data) {
      setCommonIssues(data as unknown as CommonIssue[]);
    }
  };

  // Department handlers
  const openDeptDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDeptName(dept.name);
      setDeptDescription(dept.description || '');
    } else {
      setEditingDept(null);
      setDeptName('');
      setDeptDescription('');
    }
    setDeptDialogOpen(true);
  };

  const handleDeptSubmit = async () => {
    if (!deptName.trim()) return;

    setDeptSubmitting(true);

    if (editingDept) {
      const { error } = await supabase
        .from('departments')
        .update({ name: deptName, description: deptDescription || null })
        .eq('id', editingDept.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Departamento actualizado' });
        fetchDepartments();
        setDeptDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('departments')
        .insert({ name: deptName, description: deptDescription || null });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Departamento creado' });
        fetchDepartments();
        setDeptDialogOpen(false);
      }
    }

    setDeptSubmitting(false);
  };

  const handleDeptDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este departamento?')) return;

    const { error } = await supabase.from('departments').delete().eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Departamento eliminado' });
      fetchDepartments();
    }
  };

  // Common Issue handlers
  const openIssueDialog = (issue?: CommonIssue) => {
    if (issue) {
      setEditingIssue(issue);
      setIssueTitle(issue.title);
      setIssueDescription(issue.description || '');
      setIssueDepartmentId(issue.department_id || '');
      setIssueKeywords(issue.keywords?.join(', ') || '');
      setIssueActive(issue.is_active);
    } else {
      setEditingIssue(null);
      setIssueTitle('');
      setIssueDescription('');
      setIssueDepartmentId('');
      setIssueKeywords('');
      setIssueActive(true);
    }
    setIssueDialogOpen(true);
  };

  const handleIssueSubmit = async () => {
    if (!issueTitle.trim()) return;

    setIssueSubmitting(true);
    const keywordsArray = issueKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const issueData = {
      title: issueTitle,
      description: issueDescription || null,
      department_id: issueDepartmentId || null,
      keywords: keywordsArray,
      is_active: issueActive,
    };

    if (editingIssue) {
      const { error } = await supabase
        .from('common_issues')
        .update(issueData)
        .eq('id', editingIssue.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Problema común actualizado' });
        fetchCommonIssues();
        setIssueDialogOpen(false);
      }
    } else {
      const { error } = await supabase.from('common_issues').insert(issueData);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Problema común creado' });
        fetchCommonIssues();
        setIssueDialogOpen(false);
      }
    }

    setIssueSubmitting(false);
  };

  const handleIssueDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este problema común?')) return;

    const { error } = await supabase.from('common_issues').delete().eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Problema común eliminado' });
      fetchCommonIssues();
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
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Gestiona departamentos, problemas comunes y preferencias del sistema
        </p>
      </div>

      <Tabs defaultValue="departments" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Departamentos</span>
          </TabsTrigger>
          <TabsTrigger value="common-issues" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Problemas Comunes</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Seguridad</span>
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departamentos</CardTitle>
                <CardDescription>Gestiona los departamentos del sistema</CardDescription>
              </div>
              <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openDeptDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Departamento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingDept
                        ? 'Modifica los datos del departamento'
                        : 'Crea un nuevo departamento en el sistema'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">Nombre *</Label>
                      <Input
                        id="dept-name"
                        value={deptName}
                        onChange={(e) => setDeptName(e.target.value)}
                        placeholder="Nombre del departamento"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept-description">Descripción</Label>
                      <Textarea
                        id="dept-description"
                        value={deptDescription}
                        onChange={(e) => setDeptDescription(e.target.value)}
                        placeholder="Descripción del departamento"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleDeptSubmit} disabled={deptSubmitting || !deptName.trim()}>
                      {deptSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingDept ? 'Guardar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dept.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeptDialog(dept)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeptDelete(dept.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {departments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No hay departamentos registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Common Issues Tab */}
        <TabsContent value="common-issues">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Problemas Comunes</CardTitle>
                <CardDescription>
                  Gestiona las sugerencias de problemas frecuentes para tickets
                </CardDescription>
              </div>
              <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openIssueDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Problema
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingIssue ? 'Editar Problema Común' : 'Nuevo Problema Común'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingIssue
                        ? 'Modifica los datos del problema común'
                        : 'Crea una nueva sugerencia de problema frecuente'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="issue-title">Título *</Label>
                      <Input
                        id="issue-title"
                        value={issueTitle}
                        onChange={(e) => setIssueTitle(e.target.value)}
                        placeholder="Ej: Error al iniciar sesión"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issue-description">Descripción</Label>
                      <Textarea
                        id="issue-description"
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        placeholder="Descripción detallada del problema"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issue-department">Departamento (opcional)</Label>
                      <Select value={issueDepartmentId} onValueChange={setIssueDepartmentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los departamentos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos los departamentos</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issue-keywords">Palabras clave (separadas por coma)</Label>
                      <Input
                        id="issue-keywords"
                        value={issueKeywords}
                        onChange={(e) => setIssueKeywords(e.target.value)}
                        placeholder="Ej: login, acceso, contraseña"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="issue-active">Activo</Label>
                      <Switch
                        id="issue-active"
                        checked={issueActive}
                        onCheckedChange={setIssueActive}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleIssueSubmit}
                      disabled={issueSubmitting || !issueTitle.trim()}
                    >
                      {issueSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingIssue ? 'Guardar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commonIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          {issue.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {issue.department?.name || 'Todos'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{issue.usage_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={issue.is_active ? 'default' : 'outline'}>
                          {issue.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openIssueDialog(issue)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleIssueDelete(issue.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {commonIssues.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay problemas comunes registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Configuración de Notificaciones
              </CardTitle>
              <CardDescription>
                Gestiona las preferencias de notificaciones del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificaciones de nuevos tickets</div>
                    <div className="text-xs text-muted-foreground">
                      Recibe notificaciones cuando se creen nuevos tickets
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificaciones de mensajes</div>
                    <div className="text-xs text-muted-foreground">
                      Recibe notificaciones cuando recibas nuevos mensajes
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificaciones de cambio de estado</div>
                    <div className="text-xs text-muted-foreground">
                      Recibe notificaciones cuando cambie el estado de un ticket
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificaciones por correo</div>
                    <div className="text-xs text-muted-foreground">
                      Enviar resumen diario de actividades por correo electrónico
                    </div>
                  </div>
                  <Switch />
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => {
                toast({ title: 'Preferencias guardadas', description: 'Tus preferencias de notificación han sido actualizadas.' });
              }}>
                Guardar Preferencias
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Configuración de Seguridad
              </CardTitle>
              <CardDescription>
                Gestiona las políticas de seguridad del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Autenticación de dos factores</div>
                    <div className="text-xs text-muted-foreground">
                      Requerir verificación adicional al iniciar sesión
                    </div>
                  </div>
                  <Badge variant="outline">Próximamente</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Bloqueo por intentos fallidos</div>
                    <div className="text-xs text-muted-foreground">
                      Bloquear cuenta después de 5 intentos fallidos de inicio de sesión
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Expiración de sesión</div>
                    <div className="text-xs text-muted-foreground">
                      Cerrar sesión automáticamente después de inactividad
                    </div>
                  </div>
                  <Select defaultValue="60">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Política de contraseñas</div>
                    <div className="text-xs text-muted-foreground">
                      Requerir contraseñas seguras con mayúsculas, números y símbolos
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => {
                toast({ title: 'Configuración guardada', description: 'La configuración de seguridad ha sido actualizada.' });
              }}>
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
