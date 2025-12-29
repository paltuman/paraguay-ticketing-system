import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logAuditEvent } from '@/lib/audit';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useImpersonation } from '@/hooks/useImpersonation';
import { Loader2, Search, Users as UsersIcon, Shield, UserCog, MoreHorizontal, KeyRound, UserX, UserCheck, Trash2, Eye, Crown } from 'lucide-react';
import { Profile, AppRole, roleLabels, Department } from '@/types/database';
import { Navigate, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserWithRoles extends Profile {
  roles: AppRole[];
  is_active?: boolean;
}

export default function Users() {
  const { isAdmin, isSuperAdmin, user: currentUser, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (profilesError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
      });
      setIsLoading(false);
      return;
    }

    // Fetch roles for all users
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      setIsLoading(false);
      return;
    }

    // Combine profiles with roles
    const usersWithRoles: UserWithRoles[] = profiles.map((profile) => ({
      ...profile,
      is_active: (profile as any).is_active ?? true,
      roles: roles
        .filter((r) => r.user_id === profile.id)
        .map((r) => r.role as AppRole),
    }));

    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (!error && data) {
      setDepartments(data);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    // First, delete existing roles
    await supabase.from('user_roles').delete().eq('user_id', userId);

    // Insert new role
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: newRole,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el rol',
      });
      return;
    }

    toast({
      title: 'Rol actualizado',
      description: `El rol ha sido cambiado a ${roleLabels[newRole]}`,
    });

    fetchUsers();
    setIsRoleDialogOpen(false);
  };

  const handleDepartmentChange = async (userId: string, departmentId: string | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ department_id: departmentId === 'none' ? null : departmentId })
      .eq('id', userId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el departamento',
      });
      return;
    }

    toast({
      title: 'Departamento actualizado',
    });

    fetchUsers();
  };

  const handleToggleActive = async (userId: string, userEmail: string, isActive: boolean) => {
    const newStatus = !isActive;
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', userId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado del usuario',
      });
      return;
    }

    // Log audit event
    await logAuditEvent({
      action: newStatus ? 'user_activated' : 'user_deactivated',
      entityType: 'user',
      entityId: userId,
      details: { email: userEmail, new_status: newStatus },
      userId: currentUser?.id,
    });

    toast({
      title: isActive ? 'Usuario inactivado' : 'Usuario activado',
      description: isActive ? 'El usuario ya no podrá acceder al sistema' : 'El usuario puede acceder nuevamente',
    });

    fetchUsers();
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      // Use Supabase's built-in password reset - same as "forgot password"
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'No se pudo enviar el correo de restablecimiento',
        });
      } else {
        toast({
          title: 'Correo enviado',
          description: `Se envió un enlace de restablecimiento de contraseña a ${selectedUser.email}`,
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'No se pudo enviar el correo',
      });
    }

    setIsSubmitting(false);
    setIsPasswordDialogOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setSelectedUser(null);
  };

  // Superadmin: Delete user permanently
  const handleDeleteUser = async () => {
    if (!selectedUser || !isSuperAdmin) return;

    setIsSubmitting(true);

    try {
      // First delete from profiles (will cascade to user_roles)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (profileError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo eliminar el perfil del usuario',
        });
        setIsSubmitting(false);
        return;
      }

      // Log audit event
      await logAuditEvent({
        action: 'user_deleted',
        entityType: 'user',
        entityId: selectedUser.id,
        details: { email: selectedUser.email, full_name: selectedUser.full_name },
        userId: currentUser?.id,
      });

      toast({
        title: 'Usuario eliminado',
        description: `El usuario ${selectedUser.full_name} ha sido eliminado permanentemente`,
      });

      fetchUsers();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'No se pudo eliminar el usuario',
      });
    }

    setIsSubmitting(false);
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  // Superadmin: Impersonate user
  const handleImpersonateUser = async (user: UserWithRoles) => {
    if (!isSuperAdmin || !currentUser || !currentProfile) return;

    // Log audit event
    await logAuditEvent({
      action: 'user_impersonation_started',
      entityType: 'user',
      entityId: user.id,
      details: { 
        target_email: user.email, 
        target_name: user.full_name,
        impersonator_email: currentProfile.email 
      },
      userId: currentUser.id,
    });

    startImpersonation(currentUser.id, user.id, user.full_name);
    
    toast({
      title: 'Modo suplantación activado',
      description: `Ahora estás viendo el sistema como ${user.full_name}`,
    });

    navigate('/dashboard');
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive text-destructive-foreground';
      case 'supervisor':
        return 'bg-status-in-progress text-white';
      case 'support_user':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted';
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
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Administra los usuarios y sus roles en el sistema
        </p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-4 sm:pt-6">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            Usuarios ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden md:table-cell">Departamento</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Registrado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const primaryRole = user.roles[0] || 'support_user';
                  const dept = departments.find((d) => d.id === user.department_id);
                  const isActive = user.is_active !== false;

                  return (
                    <TableRow key={user.id} className={!isActive ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(primaryRole)}>
                          {roleLabels[primaryRole]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Select
                          value={user.department_id || 'none'}
                          onValueChange={(v) => handleDepartmentChange(user.id, v)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sin departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin departamento</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden lg:table-cell">
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={user.id === currentUser?.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsRoleDialogOpen(true);
                              }}
                              disabled={!isSuperAdmin && primaryRole === 'admin'}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Cambiar Rol
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsPasswordDialogOpen(true);
                              }}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Restablecer Contraseña
                            </DropdownMenuItem>
                            
                            {/* Superadmin-only options */}
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleImpersonateUser(user)}
                                  className="text-primary"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver como este usuario
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(user.id, user.email, isActive)}
                              className={isActive ? 'text-destructive focus:text-destructive' : 'text-status-resolved focus:text-status-resolved'}
                            >
                              {isActive ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Inactivar Usuario
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activar Usuario
                                </>
                              )}
                            </DropdownMenuItem>
                            
                            {/* Superadmin can delete users */}
                            {isSuperAdmin && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar permanentemente
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={(open) => {
        setIsRoleDialogOpen(open);
        if (!open) setSelectedUser(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo rol para {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                {/* Superadmin role only visible to superadmins */}
                {isSuperAdmin && (
                  <Button
                    variant={selectedUser.roles[0] === 'superadmin' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleRoleChange(selectedUser.id, 'superadmin')}
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    {roleLabels['superadmin']}
                    <span className="ml-auto text-xs opacity-60">Control total</span>
                  </Button>
                )}
                {(['admin', 'supervisor', 'support_user'] as AppRole[]).map((role) => (
                  <Button
                    key={role}
                    variant={selectedUser.roles[0] === role ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleRoleChange(selectedUser.id, role)}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {roleLabels[role]}
                    {role === 'admin' && (
                      <span className="ml-auto text-xs opacity-60">Acceso total</span>
                    )}
                    {role === 'supervisor' && (
                      <span className="ml-auto text-xs opacity-60">Solo estadísticas</span>
                    )}
                    {role === 'support_user' && (
                      <span className="ml-auto text-xs opacity-60">Tickets propios</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        setIsPasswordDialogOpen(open);
        if (!open) {
          setSelectedUser(null);
          setNewPassword('');
          setConfirmPassword('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription>
              Se enviará un correo a {selectedUser?.email} con un enlace para restablecer la contraseña.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Al hacer clic en "Enviar Enlace", el usuario recibirá un correo con instrucciones para restablecer su contraseña.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePasswordReset} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Enlace'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog - Superadmin only */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) setSelectedUser(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminar Usuario Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}) del sistema. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar permanentemente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}