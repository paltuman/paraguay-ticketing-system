import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
  Calendar as CalendarIcon,
  Download,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  user_activated: <UserPlus className="h-4 w-4" />,
  user_deactivated: <Trash2 className="h-4 w-4" />,
  user_impersonation_started: <Eye className="h-4 w-4" />,
  user_impersonation_ended: <Eye className="h-4 w-4" />,
  ticket_status_changed: <FileEdit className="h-4 w-4" />,
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
  user_activated: 'Usuario activado',
  user_deactivated: 'Usuario desactivado',
  user_impersonation_started: 'Suplantación iniciada',
  user_impersonation_ended: 'Suplantación terminada',
  ticket_status_changed: 'Estado de ticket cambiado',
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
  user_activated: 'bg-status-resolved text-white',
  user_deactivated: 'bg-destructive text-destructive-foreground',
  user_impersonation_started: 'bg-status-in-progress text-white',
  user_impersonation_ended: 'bg-muted text-muted-foreground',
  ticket_status_changed: 'bg-status-open text-white',
};

export default function AuditLogs() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

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
      .limit(1000);

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

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    // Date filter
    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.created_at);
      if (startDate && endDate) {
        matchesDate = isWithinInterval(logDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        });
      } else if (startDate) {
        matchesDate = logDate >= startOfDay(startDate);
      } else if (endDate) {
        matchesDate = logDate <= endOfDay(endDate);
      }
    }
    
    return matchesSearch && matchesAction && matchesDate;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  const exportToPDF = () => {
    if (filteredLogs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin datos',
        description: 'No hay registros para exportar',
      });
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('Registro de Auditoría', 14, 22);
      
      // Date range info
      doc.setFontSize(10);
      let dateInfo = 'Todos los registros';
      if (startDate && endDate) {
        dateInfo = `Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
      } else if (startDate) {
        dateInfo = `Desde: ${format(startDate, 'dd/MM/yyyy')}`;
      } else if (endDate) {
        dateInfo = `Hasta: ${format(endDate, 'dd/MM/yyyy')}`;
      }
      doc.text(dateInfo, 14, 30);
      doc.text(`Total de registros: ${filteredLogs.length}`, 14, 36);
      doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 42);

      // Table
      const tableData = filteredLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
        log.user_profile?.full_name || 'Sistema',
        actionLabels[log.action] || log.action,
        log.entity_type,
        log.entity_id || '-',
      ]);

      autoTable(doc, {
        head: [['Fecha/Hora', 'Usuario', 'Acción', 'Entidad', 'ID Entidad']],
        body: tableData,
        startY: 48,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`auditoria_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);

      toast({
        title: 'Exportación exitosa',
        description: 'El archivo PDF ha sido descargado',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo exportar el archivo PDF',
      });
    }

    setIsExporting(false);
  };

  const exportToExcel = () => {
    if (filteredLogs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin datos',
        description: 'No hay registros para exportar',
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData = filteredLogs.map(log => ({
        'Fecha/Hora': format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
        'Usuario': log.user_profile?.full_name || 'Sistema',
        'Email Usuario': log.user_profile?.email || '-',
        'Acción': actionLabels[log.action] || log.action,
        'Tipo Entidad': log.entity_type,
        'ID Entidad': log.entity_id || '-',
        'Detalles': log.details ? JSON.stringify(log.details) : '-',
        'IP': log.ip_address || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');

      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Fecha/Hora
        { wch: 25 }, // Usuario
        { wch: 30 }, // Email
        { wch: 25 }, // Acción
        { wch: 15 }, // Tipo Entidad
        { wch: 40 }, // ID Entidad
        { wch: 50 }, // Detalles
        { wch: 15 }, // IP
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `auditoria_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);

      toast({
        title: 'Exportación exitosa',
        description: 'El archivo Excel ha sido descargado',
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo exportar el archivo Excel',
      });
    }

    setIsExporting(false);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search and Action Filter */}
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

            {/* Row 2: Date Filters and Export */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end flex-1">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-[160px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy') : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha Fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-[160px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy') : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearDateFilters}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={exportToPDF}
                  disabled={isExporting || filteredLogs.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={exportToExcel}
                  disabled={isExporting || filteredLogs.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Registros ({filteredLogs.length})
          </CardTitle>
          <CardDescription>
            {startDate || endDate 
              ? `Filtrado por fecha${startDate ? ` desde ${format(startDate, 'dd/MM/yyyy')}` : ''}${endDate ? ` hasta ${format(endDate, 'dd/MM/yyyy')}` : ''}`
              : 'Últimos 1000 eventos del sistema'
            }
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
