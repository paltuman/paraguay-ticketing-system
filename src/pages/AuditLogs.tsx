import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Search,
  Shield,
  LogIn,
  LogOut,
  KeyRound,
  UserPlus,
  FileEdit,
  Trash2,
  Eye,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string;
  } | null;
}

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  password_change: <KeyRound className="h-4 w-4" />,
  password_reset: <KeyRound className="h-4 w-4" />,
  user_created: <UserPlus className="h-4 w-4" />,
  user_updated: <FileEdit className="h-4 w-4" />,
  user_deleted: <Trash2 className="h-4 w-4" />,
  role_changed: <Shield className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  password_change: 'Cambio de contraseña',
  password_reset: 'Restablecimiento de contraseña',
  user_created: 'Usuario creado',
  user_updated: 'Usuario actualizado',
  user_deleted: 'Usuario eliminado',
  role_changed: 'Cambio de rol',
};

const actionColors: Record<string, string> = {
  login: 'bg-status-resolved text-white',
  logout: 'bg-muted text-muted-foreground',
  password_change: 'bg-status-in-progress text-white',
  password_reset: 'bg-status-in-progress text-white',
  user_created: 'bg-primary text-primary-foreground',
  user_updated: 'bg-status-open text-white',
  user_deleted: 'bg-destructive text-destructive-foreground',
  role_changed: 'bg-primary text-primary-foreground',
};

export default function AuditLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchLogs();
    subscribeToLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && data) {
      // Fetch user profiles for each log
      const userIds = [...new Set(data.filter(l => l.user_id).map(l => l.user_id))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const logsWithProfiles = data.map(log => ({
          ...log,
          user_profile: log.user_id ? profileMap.get(log.user_id) || null : null,
        }));

        setLogs(logsWithProfiles);
      } else {
        setLogs(data);
      }
    }

    setIsLoading(false);
  };

  const subscribeToLogs = () => {
    const channel = supabase
      .channel('audit-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        async (payload) => {
          const newLog = payload.new as AuditLog;
          
          // Fetch user profile if exists
          if (newLog.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('id', newLog.user_id)
              .maybeSingle();
            
            newLog.user_profile = profile;
          }
          
          setLogs(prev => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Registro de Auditoría
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Historial de acciones y cambios en el sistema
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs} className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario, acción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action] || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Registros ({filteredLogs.length})
          </CardTitle>
          <CardDescription>
            Últimos 500 eventos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead className="hidden md:table-cell">Entidad</TableHead>
                  <TableHead className="w-[80px]">Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay registros de auditoría
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div>
                          <p className="font-medium">
                            {format(new Date(log.created_at), 'dd MMM yyyy', { locale: es })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'HH:mm:ss', { locale: es })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.user_profile ? (
                          <div>
                            <p className="font-medium text-sm">{log.user_profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{log.user_profile.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sistema</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${actionColors[log.action] || 'bg-muted'} flex items-center gap-1 w-fit`}>
                          {actionIcons[log.action] || <FileEdit className="h-3 w-3" />}
                          <span className="text-xs">{actionLabels[log.action] || log.action}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{log.entity_type}</span>
                        {log.entity_id && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            ID: {log.entity_id}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles del Registro</DialogTitle>
            <DialogDescription>
              Información completa del evento de auditoría
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha y Hora</p>
                    <p className="font-medium">
                      {format(new Date(selectedLog.created_at), "dd MMM yyyy 'a las' HH:mm:ss", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Acción</p>
                    <Badge className={actionColors[selectedLog.action] || 'bg-muted'}>
                      {actionLabels[selectedLog.action] || selectedLog.action}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  {selectedLog.user_profile ? (
                    <div>
                      <p className="font-medium">{selectedLog.user_profile.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedLog.user_profile.email}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Sistema</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Entidad</p>
                    <p className="font-medium">{selectedLog.entity_type}</p>
                  </div>
                  {selectedLog.entity_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">ID de Entidad</p>
                      <p className="font-medium text-sm break-all">{selectedLog.entity_id}</p>
                    </div>
                  )}
                </div>

                {selectedLog.ip_address && (
                  <div>
                    <p className="text-xs text-muted-foreground">Dirección IP</p>
                    <p className="font-medium">{selectedLog.ip_address}</p>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <p className="text-xs text-muted-foreground">Navegador/Dispositivo</p>
                    <p className="text-sm break-all">{selectedLog.user_agent}</p>
                  </div>
                )}

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Detalles Adicionales</p>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}