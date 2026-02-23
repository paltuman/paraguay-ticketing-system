import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import { TicketStatusHistory, statusLabels } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryPanelProps {
  history: TicketStatusHistory[];
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Historial
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cambios registrados</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm border-l-2 border-primary/20 pl-3">
                <div>
                  <p className="font-medium">
                    {item.old_status
                      ? `${statusLabels[item.old_status]} → ${statusLabels[item.new_status]}`
                      : statusLabels[item.new_status]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.changer?.full_name || 'Sistema'} •{' '}
                    {format(new Date(item.created_at), 'dd MMM HH:mm', { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
