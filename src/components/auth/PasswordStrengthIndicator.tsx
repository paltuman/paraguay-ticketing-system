import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Una mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p) => /[0-9]/.test(p) },
  { label: 'Un carácter especial', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { strength, passedCount } = useMemo(() => {
    const passed = requirements.filter((req) => req.test(password));
    const count = passed.length;
    
    let level: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    if (count >= 5) level = 'strong';
    else if (count >= 4) level = 'good';
    else if (count >= 2) level = 'fair';
    
    return { strength: level, passedCount: count };
  }, [password]);

  const strengthColors = {
    weak: 'bg-destructive',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthLabels = {
    weak: 'Débil',
    fair: 'Regular',
    good: 'Buena',
    strong: 'Fuerte',
  };

  if (!password) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Fuerza de contraseña</span>
          <span className={cn(
            'font-medium',
            strength === 'weak' && 'text-destructive',
            strength === 'fair' && 'text-orange-500',
            strength === 'good' && 'text-yellow-600',
            strength === 'strong' && 'text-green-600'
          )}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              strengthColors[strength]
            )}
            style={{ width: `${(passedCount / requirements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req, index) => {
          const passed = req.test(password);
          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors duration-200',
                passed ? 'text-green-600' : 'text-muted-foreground'
              )}
            >
              {passed ? (
                <Check className="h-3 w-3 flex-shrink-0" />
              ) : (
                <X className="h-3 w-3 flex-shrink-0 opacity-50" />
              )}
              <span>{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
