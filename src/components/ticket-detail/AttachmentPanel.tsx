import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { TicketAttachment } from '@/types/database';

interface AttachmentPanelProps {
  attachments: TicketAttachment[];
  onDownload: (attachment: TicketAttachment) => void;
}

const getFileIcon = (type: string) =>
  type.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export function AttachmentPanel({ attachments, onDownload }: AttachmentPanelProps) {
  if (attachments.length === 0) return null;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-primary" />
          Archivos Adjuntos ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="h-10 w-10 flex items-center justify-center bg-background rounded">
                {getFileIcon(attachment.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onDownload(attachment)}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
