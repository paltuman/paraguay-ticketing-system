import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table as TableIcon, Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ExportData {
  tickets?: any[];
  stats?: {
    total: number;
    byStatus: Record<string, number>;
    avgRating: number;
    totalSurveys: number;
  };
  agents?: any[];
}

interface ExportButtonProps {
  data?: ExportData;
  filename?: string;
}

export function ExportButton({ data, filename = 'reporte' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel'>('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const fetchExportData = async (start: string, end: string): Promise<ExportData> => {
    if (data) return data;

    // Fetch tickets with date range filter
    let ticketQuery = supabase
      .from('tickets')
      .select(`
        ticket_number,
        title,
        status,
        priority,
        created_at,
        resolved_at,
        creator:profiles!tickets_created_by_fkey(full_name),
        department:departments(name)
      `)
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`)
      .order('created_at', { ascending: false });

    const { data: tickets } = await ticketQuery;

    // Fetch agent stats
    const { data: agents } = await supabase
      .from('user_performance_stats')
      .select('*')
      .order('avg_rating', { ascending: false });

    // Fetch surveys within date range
    const { data: surveys } = await supabase
      .from('satisfaction_surveys')
      .select('rating')
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`);

    const total = tickets?.length || 0;
    const byStatus = {
      open: tickets?.filter(t => t.status === 'open').length || 0,
      in_progress: tickets?.filter(t => t.status === 'in_progress').length || 0,
      resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
      closed: tickets?.filter(t => t.status === 'closed').length || 0,
    };
    const avgRating = surveys && surveys.length > 0
      ? surveys.reduce((acc, s) => acc + s.rating, 0) / surveys.length
      : 0;

    return {
      tickets: tickets || [],
      stats: {
        total,
        byStatus,
        avgRating,
        totalSurveys: surveys?.length || 0,
      },
      agents: agents || [],
    };
  };

  const handleExportClick = (type: 'pdf' | 'excel') => {
    setExportType(type);
    // Set default dates to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setEndDate(format(today, 'yyyy-MM-dd'));
    setStartDate(format(thirtyDaysAgo, 'yyyy-MM-dd'));
    setIsDialogOpen(true);
  };

  const validateDates = () => {
    if (!startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes seleccionar un rango de fechas',
      });
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La fecha de inicio debe ser anterior a la fecha fin',
      });
      return false;
    }
    return true;
  };

  const exportToPDF = async () => {
    if (!validateDates()) return;
    
    setIsExporting(true);
    try {
      const exportData = await fetchExportData(startDate, endDate);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(20);
      doc.setTextColor(30, 58, 95);
      doc.text('Reporte de Estadísticas', pageWidth / 2, 20, { align: 'center' });

      // Date range
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-PY')}`, pageWidth / 2, 34, { align: 'center' });

      // Stats Summary
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 95);
      doc.text('Resumen General', 14, 46);

      if (exportData.stats) {
        const statsData = [
          ['Total Tickets', exportData.stats.total.toString()],
          ['Abiertos', exportData.stats.byStatus.open.toString()],
          ['En Proceso', exportData.stats.byStatus.in_progress.toString()],
          ['Resueltos', exportData.stats.byStatus.resolved.toString()],
          ['Cerrados', exportData.stats.byStatus.closed.toString()],
          ['Calificación Promedio', exportData.stats.avgRating.toFixed(1)],
          ['Total Encuestas', exportData.stats.totalSurveys.toString()],
        ];

        autoTable(doc, {
          startY: 51,
          head: [['Métrica', 'Valor']],
          body: statsData,
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 95] },
        });
      }

      // Agents Table
      if (exportData.agents && exportData.agents.length > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 95);
        doc.text('Calificaciones por Agente', 14, finalY + 15);

        const agentData = exportData.agents.map((agent: any) => [
          agent.full_name || 'N/A',
          Number(agent.avg_rating).toFixed(1),
          agent.total_surveys?.toString() || '0',
          agent.resolved_tickets?.toString() || '0',
        ]);

        autoTable(doc, {
          startY: finalY + 20,
          head: [['Agente', 'Calificación', 'Encuestas', 'Resueltos']],
          body: agentData,
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 95] },
        });
      }

      // Tickets Table (new page)
      if (exportData.tickets && exportData.tickets.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 95);
        doc.text('Lista de Tickets', 14, 20);

        const statusLabels: Record<string, string> = {
          open: 'Abierto',
          in_progress: 'En Proceso',
          resolved: 'Resuelto',
          closed: 'Cerrado',
        };

        const priorityLabels: Record<string, string> = {
          low: 'Baja',
          medium: 'Media',
          high: 'Alta',
          urgent: 'Urgente',
        };

        const ticketData = exportData.tickets.map((ticket: any) => [
          `#${ticket.ticket_number}`,
          ticket.title?.substring(0, 30) + (ticket.title?.length > 30 ? '...' : ''),
          statusLabels[ticket.status] || ticket.status,
          priorityLabels[ticket.priority] || ticket.priority,
          ticket.department?.name || 'Sin asignar',
          new Date(ticket.created_at).toLocaleDateString('es-PY'),
        ]);

        autoTable(doc, {
          startY: 25,
          head: [['#', 'Título', 'Estado', 'Prioridad', 'Departamento', 'Fecha']],
          body: ticketData,
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 95] },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`${filename}-${startDate}-${endDate}.pdf`);
      toast({
        title: 'PDF exportado',
        description: `Reporte del ${format(new Date(startDate), 'dd/MM/yyyy')} al ${format(new Date(endDate), 'dd/MM/yyyy')} descargado`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo exportar el PDF',
      });
    }
    setIsExporting(false);
  };

  const exportToExcel = async () => {
    if (!validateDates()) return;
    
    setIsExporting(true);
    try {
      const exportData = await fetchExportData(startDate, endDate);
      const wb = XLSX.utils.book_new();

      // Stats sheet
      if (exportData.stats) {
        const statsData = [
          ['Período', `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`],
          ['Generado', new Date().toLocaleDateString('es-PY')],
          [],
          ['Métrica', 'Valor'],
          ['Total Tickets', exportData.stats.total],
          ['Abiertos', exportData.stats.byStatus.open],
          ['En Proceso', exportData.stats.byStatus.in_progress],
          ['Resueltos', exportData.stats.byStatus.resolved],
          ['Cerrados', exportData.stats.byStatus.closed],
          ['Calificación Promedio', Number(exportData.stats.avgRating.toFixed(1))],
          ['Total Encuestas', exportData.stats.totalSurveys],
        ];
        const wsStats = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, wsStats, 'Resumen');
      }

      // Agents sheet
      if (exportData.agents && exportData.agents.length > 0) {
        const agentData = [
          ['Agente', 'Calificación', 'Encuestas', 'Tickets Resueltos', 'Total Tickets'],
          ...exportData.agents.map((agent: any) => [
            agent.full_name || 'N/A',
            Number(agent.avg_rating).toFixed(1),
            agent.total_surveys || 0,
            agent.resolved_tickets || 0,
            agent.total_tickets || 0,
          ]),
        ];
        const wsAgents = XLSX.utils.aoa_to_sheet(agentData);
        XLSX.utils.book_append_sheet(wb, wsAgents, 'Agentes');
      }

      // Tickets sheet
      if (exportData.tickets && exportData.tickets.length > 0) {
        const statusLabels: Record<string, string> = {
          open: 'Abierto',
          in_progress: 'En Proceso',
          resolved: 'Resuelto',
          closed: 'Cerrado',
        };

        const priorityLabels: Record<string, string> = {
          low: 'Baja',
          medium: 'Media',
          high: 'Alta',
          urgent: 'Urgente',
        };

        const ticketData = [
          ['#', 'Título', 'Estado', 'Prioridad', 'Departamento', 'Creador', 'Fecha Creación', 'Fecha Resolución'],
          ...exportData.tickets.map((ticket: any) => [
            ticket.ticket_number,
            ticket.title,
            statusLabels[ticket.status] || ticket.status,
            priorityLabels[ticket.priority] || ticket.priority,
            ticket.department?.name || 'Sin asignar',
            ticket.creator?.full_name || 'N/A',
            new Date(ticket.created_at).toLocaleDateString('es-PY'),
            ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString('es-PY') : '-',
          ]),
        ];
        const wsTickets = XLSX.utils.aoa_to_sheet(ticketData);
        XLSX.utils.book_append_sheet(wb, wsTickets, 'Tickets');
      }

      XLSX.writeFile(wb, `${filename}-${startDate}-${endDate}.xlsx`);
      toast({
        title: 'Excel exportado',
        description: `Reporte del ${format(new Date(startDate), 'dd/MM/yyyy')} al ${format(new Date(endDate), 'dd/MM/yyyy')} descargado`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo exportar el Excel',
      });
    }
    setIsExporting(false);
  };

  const handleExport = () => {
    if (exportType === 'pdf') {
      exportToPDF();
    } else {
      exportToExcel();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExportClick('pdf')} className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar a PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportClick('excel')} className="gap-2">
            <TableIcon className="h-4 w-4" />
            Exportar a Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Seleccionar Rango de Fechas
            </DialogTitle>
            <DialogDescription>
              Define el período para el reporte. Este filtro es obligatorio para evitar descargar toda la base de datos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Fecha Inicio *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Fecha Fin *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="gap-2">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  {exportType === 'pdf' ? <FileText className="h-4 w-4" /> : <TableIcon className="h-4 w-4" />}
                  Exportar {exportType === 'pdf' ? 'PDF' : 'Excel'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
