import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Users as UsersIcon, Shield, UserCog } from 'lucide-react';
import { Profile, AppRole, roleLabels, Department } from '@/types/database';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserWithRoles extends Profile {
  roles: AppRole[];
}

export default function Users() {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    setIsDialogOpen(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Administra los usuarios y sus roles en el sistema
        </p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const primaryRole = user.roles[0] || 'support_user';
                const dept = departments.find((d) => d.id === user.department_id);

                return (
                  <TableRow key={user.id}>
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
                    <TableCell>
                      <Select
                        value={user.department_id || 'none'}
                        onValueChange={(v) => handleDepartmentChange(user.id, v)}
                      >
                        <SelectTrigger className="w-[200px]">
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
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Dialog
                        open={isDialogOpen && selectedUser?.id === user.id}
                        onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (!open) setSelectedUser(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedUser(user)}
                            disabled={user.id === currentUser?.id}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
                            <DialogDescription>
                              Selecciona el nuevo rol para {user.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="flex items-center gap-3 mb-4">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {(['admin', 'supervisor', 'support_user'] as AppRole[]).map(
                                (role) => (
                                  <Button
                                    key={role}
                                    variant={primaryRole === role ? 'default' : 'outline'}
                                    className="w-full justify-start"
                                    onClick={() => handleRoleChange(user.id, role)}
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    {roleLabels[role]}
                                    {role === 'admin' && (
                                      <span className="ml-auto text-xs opacity-60">
                                        Acceso total
                                      </span>
                                    )}
                                    {role === 'supervisor' && (
                                      <span className="ml-auto text-xs opacity-60">
                                        Solo estadísticas
                                      </span>
                                    )}
                                    {role === 'support_user' && (
                                      <span className="ml-auto text-xs opacity-60">
                                        Tickets propios
                                      </span>
                                    )}
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
