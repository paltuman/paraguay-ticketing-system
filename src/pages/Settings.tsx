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
  Users,
  Palette,
  Clock,
  Save,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Department, CommonIssue, AppRole, roleLabels } from '@/types/database';

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
}

interface SystemSettings {
  ticketAutoAssign: boolean;
  defaultPriority: string;
  autoCloseResolvedTickets: boolean;
  autoCloseDays: number;
  requireSurveyOnClose: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
}

export default function Settings() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [commonIssues, setCommonIssues] = useState<CommonIssue[]>([]);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
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

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    newTickets: true,
    newMessages: true,
    statusChanges: true,
    emailSummary: false,
    emailOnUrgent: true,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    lockAfterFailedAttempts: true,
    failedAttemptsLimit: 5,
    sessionTimeout: 60,
    requireStrongPassword: true,
    passwordMinLength: 8,
  });

  // System settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    ticketAutoAssign: false,
    defaultPriority: 'medium',
    autoCloseResolvedTickets: true,
    autoCloseDays: 7,
    requireSurveyOnClose: true,
    maxFileSize: 5,
    allowedFileTypes: ['image/*', 'application/pdf', 'application/msword'],
  });

  // Theme settings
  const [themeSettings, setThemeSettings] = useState({
    primaryColor: 'default',
    accentColor: 'blue',
    fontSize: 'medium',
    compactMode: false,
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchDepartments(), fetchCommonIssues(), fetchUsersWithRoles()]);
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

  const fetchUsersWithRoles = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, is_active')
      .order('full_name');

    if (profilesError || !profiles) return;

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError || !roles) return;

    const usersData: UserWithRole[] = profiles.map(profile => {
      const userRole = roles.find(r => r.user_id === profile.id);
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: (userRole?.role as AppRole) || 'support_user',
        is_active: profile.is_active,
      };
    });

    setUsersWithRoles(usersData);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Rol actualizado' });
      fetchUsersWithRoles();
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

  const handleToggleIssueActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('common_issues')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: isActive ? 'Problema activado' : 'Problema desactivado' });
      fetchCommonIssues();
    }
  };

  const saveNotificationSettings = () => {
    localStorage.setItem('notifSettings', JSON.stringify(notifSettings));
    toast({ title: 'Preferencias guardadas', description: 'Tus preferencias de notificación han sido actualizadas.' });
  };

  const saveSecuritySettings = () => {
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
    toast({ title: 'Configuración guardada', description: 'La configuración de seguridad ha sido actualizada.' });
  };

  const saveSystemSettings = () => {
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    toast({ title: 'Configuración guardada', description: 'La configuración del sistema ha sido actualizada.' });
  };

  const saveThemeSettings = () => {
    localStorage.setItem('themeSettings', JSON.stringify(themeSettings));
    // Trigger event to apply theme immediately
    window.dispatchEvent(new CustomEvent('themeSettingsChanged', { detail: themeSettings }));
    // Also trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'themeSettings',
      newValue: JSON.stringify(themeSettings),
    }));
    toast({ title: 'Tema guardado', description: 'Las preferencias de tema han sido aplicadas.' });
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
          Gestiona departamentos, roles, notificaciones y preferencias del sistema
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
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Sistema</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apariencia</span>
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleIssueActive(issue.id, !issue.is_active)}
                            title={issue.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {issue.is_active ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-status-resolved"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 6 9 17l-5-5"/></svg>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openIssueDialog(issue)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleIssueDelete(issue.id)}
                            title="Eliminar"
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

        {/* Roles Tab */}
        <TabsContent value="roles">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Gestión de Roles
              </CardTitle>
              <CardDescription>
                Administra los roles y permisos de los usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{usersWithRoles.filter(u => u.role === 'superadmin').length}</div>
                    <p className="text-xs text-muted-foreground">Super Administradores</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{usersWithRoles.filter(u => u.role === 'admin').length}</div>
                    <p className="text-xs text-muted-foreground">Administradores</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{usersWithRoles.filter(u => u.role === 'supervisor').length}</div>
                    <p className="text-xs text-muted-foreground">Supervisores</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{usersWithRoles.filter(u => u.role === 'support_user').length}</div>
                    <p className="text-xs text-muted-foreground">Usuarios de Soporte</p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol Actual</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Cambiar Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithRoles.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'superadmin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'destructive'}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                          disabled={user.role === 'superadmin' && !isSuperAdmin}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="support_user">Usuario de Soporte</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                            {isSuperAdmin && (
                              <SelectItem value="superadmin">Super Administrador</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
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
                  <Switch 
                    checked={notifSettings.newTickets}
                    onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, newTickets: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificaciones de mensajes</div>
                    <div className="text-xs text-muted-foreground">
                      Recibe notificaciones cuando recibas nuevos mensajes
                    </div>
                  </div>
                  <Switch 
                    checked={notifSettings.newMessages}
                    onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, newMessages: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificaciones de cambio de estado</div>
                    <div className="text-xs text-muted-foreground">
                      Recibe notificaciones cuando cambie el estado de un ticket
                    </div>
                  </div>
                  <Switch 
                    checked={notifSettings.statusChanges}
                    onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, statusChanges: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificación inmediata de urgentes</div>
                    <div className="text-xs text-muted-foreground">
                      Recibir notificación por correo cuando se cree un ticket urgente
                    </div>
                  </div>
                  <Switch 
                    checked={notifSettings.emailOnUrgent}
                    onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, emailOnUrgent: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Resumen diario por correo</div>
                    <div className="text-xs text-muted-foreground">
                      Enviar resumen diario de actividades por correo electrónico
                    </div>
                  </div>
                  <Switch 
                    checked={notifSettings.emailSummary}
                    onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, emailSummary: checked }))}
                  />
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={saveNotificationSettings}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Preferencias
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Configuración del Sistema
              </CardTitle>
              <CardDescription>
                Gestiona las configuraciones generales del sistema de tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Asignación automática de tickets</div>
                    <div className="text-xs text-muted-foreground">
                      Asignar automáticamente nuevos tickets a agentes disponibles
                    </div>
                  </div>
                  <Switch 
                    checked={systemSettings.ticketAutoAssign}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, ticketAutoAssign: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Prioridad por defecto</div>
                    <div className="text-xs text-muted-foreground">
                      Prioridad asignada a nuevos tickets por defecto
                    </div>
                  </div>
                  <Select 
                    value={systemSettings.defaultPriority}
                    onValueChange={(value) => setSystemSettings(prev => ({ ...prev, defaultPriority: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Cierre automático de tickets resueltos</div>
                    <div className="text-xs text-muted-foreground">
                      Cerrar automáticamente tickets marcados como resueltos
                    </div>
                  </div>
                  <Switch 
                    checked={systemSettings.autoCloseResolvedTickets}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoCloseResolvedTickets: checked }))}
                  />
                </div>
                {systemSettings.autoCloseResolvedTickets && (
                  <div className="flex items-center justify-between rounded-lg border p-4 ml-6">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Días para cierre automático</div>
                      <div className="text-xs text-muted-foreground">
                        Días de espera antes de cerrar automáticamente
                      </div>
                    </div>
                    <Select 
                      value={systemSettings.autoCloseDays.toString()}
                      onValueChange={(value) => setSystemSettings(prev => ({ ...prev, autoCloseDays: parseInt(value) }))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 días</SelectItem>
                        <SelectItem value="5">5 días</SelectItem>
                        <SelectItem value="7">7 días</SelectItem>
                        <SelectItem value="14">14 días</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Requerir encuesta al cerrar</div>
                    <div className="text-xs text-muted-foreground">
                      Solicitar encuesta de satisfacción al cerrar tickets
                    </div>
                  </div>
                  <Switch 
                    checked={systemSettings.requireSurveyOnClose}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, requireSurveyOnClose: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Tamaño máximo de archivos</div>
                    <div className="text-xs text-muted-foreground">
                      Tamaño máximo permitido para archivos adjuntos
                    </div>
                  </div>
                  <Select 
                    value={systemSettings.maxFileSize.toString()}
                    onValueChange={(value) => setSystemSettings(prev => ({ ...prev, maxFileSize: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 MB</SelectItem>
                      <SelectItem value="5">5 MB</SelectItem>
                      <SelectItem value="10">10 MB</SelectItem>
                      <SelectItem value="25">25 MB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={saveSystemSettings}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Apariencia
              </CardTitle>
              <CardDescription>
                Personaliza la apariencia visual del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Color primario</div>
                    <div className="text-xs text-muted-foreground">
                      Color principal de la interfaz
                    </div>
                  </div>
                  <Select 
                    value={themeSettings.primaryColor}
                    onValueChange={(value) => setThemeSettings(prev => ({ ...prev, primaryColor: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Predeterminado</SelectItem>
                      <SelectItem value="blue">Azul</SelectItem>
                      <SelectItem value="green">Verde</SelectItem>
                      <SelectItem value="purple">Púrpura</SelectItem>
                      <SelectItem value="orange">Naranja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Tamaño de fuente</div>
                    <div className="text-xs text-muted-foreground">
                      Tamaño del texto en la interfaz
                    </div>
                  </div>
                  <Select 
                    value={themeSettings.fontSize}
                    onValueChange={(value) => setThemeSettings(prev => ({ ...prev, fontSize: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeño</SelectItem>
                      <SelectItem value="medium">Mediano</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Modo compacto</div>
                    <div className="text-xs text-muted-foreground">
                      Reducir el espaciado para mostrar más contenido
                    </div>
                  </div>
                  <Switch 
                    checked={themeSettings.compactMode}
                    onCheckedChange={(checked) => setThemeSettings(prev => ({ ...prev, compactMode: checked }))}
                  />
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={saveThemeSettings}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Tema
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
                      Bloquear cuenta después de intentos fallidos de inicio de sesión
                    </div>
                  </div>
                  <Switch 
                    checked={securitySettings.lockAfterFailedAttempts}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, lockAfterFailedAttempts: checked }))}
                  />
                </div>
                {securitySettings.lockAfterFailedAttempts && (
                  <div className="flex items-center justify-between rounded-lg border p-4 ml-6">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Límite de intentos</div>
                      <div className="text-xs text-muted-foreground">
                        Número de intentos antes de bloquear
                      </div>
                    </div>
                    <Select 
                      value={securitySettings.failedAttemptsLimit.toString()}
                      onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, failedAttemptsLimit: parseInt(value) }))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Expiración de sesión</div>
                    <div className="text-xs text-muted-foreground">
                      Cerrar sesión automáticamente después de inactividad
                    </div>
                  </div>
                  <Select 
                    value={securitySettings.sessionTimeout.toString()}
                    onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(value) }))}
                  >
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
                  <Switch 
                    checked={securitySettings.requireStrongPassword}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, requireStrongPassword: checked }))}
                  />
                </div>
                {securitySettings.requireStrongPassword && (
                  <div className="flex items-center justify-between rounded-lg border p-4 ml-6">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Longitud mínima</div>
                      <div className="text-xs text-muted-foreground">
                        Caracteres mínimos requeridos
                      </div>
                    </div>
                    <Select 
                      value={securitySettings.passwordMinLength.toString()}
                      onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(value) }))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button className="w-full sm:w-auto" onClick={saveSecuritySettings}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
