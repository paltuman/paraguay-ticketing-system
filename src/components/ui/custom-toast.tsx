import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { memo } from "react";

const getIconAndStyle = (variant: string | undefined) => {
  switch (variant) {
    case 'destructive':
      return { Icon: AlertCircle, style: 'bg-destructive/20 text-destructive' };
    default:
      return { Icon: Info, style: 'bg-primary/20 text-primary' };
  }
};

export const CustomToaster = memo(function CustomToaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const { Icon, style } = getIconAndStyle(variant);
        
        return (
          <Toast 
            key={id} 
            variant={variant}
            {...props} 
            className="group animate-toast-in data-[state=closed]:animate-toast-out backdrop-blur-md border-border/50 shadow-xl"
          >
            <div className="flex gap-3 items-start">
              <div className={`flex-shrink-0 p-1.5 rounded-full ${style}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle className="text-sm font-semibold">{title}</ToastTitle>}
                {description && <ToastDescription className="text-xs">{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </Toast>
        );
      })}
      <ToastViewport className="gap-2" />
    </ToastProvider>
  );
});
