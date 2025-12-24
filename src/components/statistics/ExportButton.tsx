import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table as TableIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

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
  const { toast } = useToast();

  const fetchExportData = async (): Promise<ExportData> => {
    if (data) return data;

    // Fetch all tickets
    const { data: tickets } = await supabase
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
      .order('created_at', { ascending: false });

    // Fetch agent stats
    const { data: agents } = await supabase
      .from('user_performance_stats')
      .select('*')
      .order('avg_rating', { ascending: false });

    // Fetch surveys
    const { data: surveys } = await supabase
      .from('satisfaction_surveys')
      .select('rating');

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

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const exportData = await fetchExportData();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(20);
      doc.setTextColor(30, 58, 95);
      doc.text('Reporte de Estadísticas', pageWidth / 2, 20, { align: 'center' });

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-PY')}`, pageWidth / 2, 28, { align: 'center' });

      // Stats Summary
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 95);
      doc.text('Resumen General', 14, 40);

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
          startY: 45,
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

        const ticketData = exportData.tickets.slice(0, 50).map((ticket: any) => [
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

      doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({
        title: 'PDF exportado',
        description: 'El reporte se ha descargado correctamente',
      });
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
    setIsExporting(true);
    try {
      const exportData = await fetchExportData();
      const wb = XLSX.utils.book_new();

      // Stats sheet
      if (exportData.stats) {
        const statsData = [
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

      XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({
        title: 'Excel exportado',
        description: 'El reporte se ha descargado correctamente',
      });
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting} className="gap-2">
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Exportar a PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="gap-2">
          <TableIcon className="h-4 w-4" />
          Exportar a Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
