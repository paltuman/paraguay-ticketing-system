import React, { useState, useCallback, memo } from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps extends ButtonProps {
  rippleColor?: string;
}

export const RippleButton = memo(React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ children, className, rippleColor = 'rgba(255, 255, 255, 0.4)', onClick, ...props }, ref) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple: Ripple = {
        id: Date.now(),
        x,
        y,
        size,
      };

      setRipples(prev => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);

      onClick?.(e);
    }, [onClick]);

    return (
      <Button
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        onClick={handleClick}
        {...props}
      >
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute rounded-full animate-ripple pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: rippleColor,
            }}
          />
        ))}
        {children}
      </Button>
    );
  }
));

RippleButton.displayName = 'RippleButton';
