import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SatisfactionSurveyProps {
  ticketId: string;
  onComplete: () => void;
}

export function SatisfactionSurvey({ ticketId, onComplete }: SatisfactionSurveyProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setIsSubmitting(true);

    const { error } = await supabase.from('satisfaction_surveys').insert({
      ticket_id: ticketId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar la encuesta',
      });
    } else {
      toast({
        title: '¡Gracias!',
        description: 'Tu opinión nos ayuda a mejorar',
      });
      onComplete();
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          ¿Cómo fue tu experiencia?
        </CardTitle>
        <CardDescription>
          Tu opinión nos ayuda a mejorar nuestro servicio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 transition-transform hover:scale-110"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>

        <Textarea
          placeholder="¿Tienes algún comentario adicional? (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="resize-none"
        />

        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Opinión'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
