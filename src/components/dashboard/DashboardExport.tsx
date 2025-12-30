import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, FileText, Image } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DashboardFiltersState } from './DashboardFilters';

interface DashboardExportProps {
  chartsRef: React.RefObject<HTMLDivElement>;
  filters: DashboardFiltersState;
  stats: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
}

export function DashboardExport({ chartsRef, filters, stats }: DashboardExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    if (!chartsRef.current) {
      toast.error('No se encontró el contenido para exportar');
      return;
    }

    setIsExporting(true);
    toast.loading('Generando PDF con gráficos...', { id: 'export-pdf' });

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Header
      pdf.setFillColor(33, 66, 99);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Reporte de Dashboard', margin, 18);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const dateRange = `${format(filters.startDate, 'dd/MM/yyyy', { locale: es })} - ${format(filters.endDate, 'dd/MM/yyyy', { locale: es })}`;
      pdf.text(`Período: ${dateRange}`, margin, 28);
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth - margin - 55, 28);

      // Stats section
      let yPos = 45;
      pdf.setTextColor(33, 66, 99);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumen de Estadísticas', margin, yPos);
      
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);

      const statsData = [
        { label: 'Total Tickets', value: stats.total, color: [59, 130, 246] },
        { label: 'Abiertos', value: stats.open, color: [59, 130, 246] },
        { label: 'En Proceso', value: stats.inProgress, color: [234, 179, 8] },
        { label: 'Resueltos', value: stats.resolved, color: [34, 197, 94] },
        { label: 'Cerrados', value: stats.closed, color: [100, 116, 139] },
      ];

      const boxWidth = (pageWidth - margin * 2 - 20) / 5;
      statsData.forEach((stat, index) => {
        const x = margin + index * (boxWidth + 5);
        
        pdf.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.roundedRect(x, yPos, boxWidth, 20, 2, 2, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.text(stat.label, x + boxWidth / 2, yPos + 7, { align: 'center' });
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(stat.value.toString(), x + boxWidth / 2, yPos + 15, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
      });

      yPos += 30;

      // Capture charts
      const canvas = await html2canvas(chartsRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if charts fit on current page
      if (yPos + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setTextColor(33, 66, 99);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Gráficos del Dashboard', margin, yPos);
      yPos += 8;

      pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${totalPages} - Sistema de Soporte`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      pdf.save(`dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exportado correctamente', { id: 'export-pdf' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF', { id: 'export-pdf' });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToImage = async () => {
    if (!chartsRef.current) {
      toast.error('No se encontró el contenido para exportar');
      return;
    }

    setIsExporting(true);
    toast.loading('Generando imagen...', { id: 'export-img' });

    try {
      const canvas = await html2canvas(chartsRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `dashboard-charts-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Imagen exportada correctamente', { id: 'export-img' });
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error('Error al exportar imagen', { id: 'export-img' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting} className="gap-2">
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4 text-red-500" />
          Exportar a PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToImage} className="gap-2 cursor-pointer">
          <Image className="h-4 w-4 text-blue-500" />
          Exportar como Imagen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
