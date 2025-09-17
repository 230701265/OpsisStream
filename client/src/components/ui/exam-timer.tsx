import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAccessibility } from '@/hooks/useAccessibility';

interface ExamTimerProps {
  startTime: Date;
  timeLimit: number; // in minutes
  onTimeUp?: () => void;
  onWarning?: (minutesLeft: number) => void;
  className?: string;
}

export function ExamTimer({ 
  startTime, 
  timeLimit, 
  onTimeUp, 
  onWarning, 
  className 
}: ExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const { announceForScreenReader } = useAccessibility();

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const elapsed = (now.getTime() - startTime.getTime()) / (1000 * 60); // minutes
      const remaining = Math.max(0, timeLimit - elapsed);
      return remaining;
    };

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Warning states
      const wasWarning = isWarning;
      const wasCritical = isCritical;

      if (remaining <= 0) {
        if (!wasCritical) {
          announceForScreenReader('Time is up! Exam will be submitted automatically.', 'assertive');
          onTimeUp?.();
        }
      } else if (remaining <= 5) {
        if (!wasCritical) {
          setIsCritical(true);
          announceForScreenReader('Critical: 5 minutes remaining!', 'assertive');
          onWarning?.(5);
        }
      } else if (remaining <= 15) {
        if (!wasWarning) {
          setIsWarning(true);
          announceForScreenReader('Warning: 15 minutes remaining', 'polite');
          onWarning?.(15);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime, timeLimit, onTimeUp, onWarning, isWarning, isCritical, announceForScreenReader]);

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (timeRemaining <= 0) return 'text-destructive';
    if (timeRemaining <= 5) return 'text-destructive';
    if (timeRemaining <= 15) return 'text-warning';
    return 'text-foreground';
  };

  const getStatusIcon = () => {
    if (timeRemaining <= 15) {
      return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    }
    return <Clock className="h-4 w-4" aria-hidden="true" />;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      <div className="text-right">
        <div className="text-sm text-muted-foreground">Time Remaining</div>
        <div 
          className={`text-xl font-bold font-mono ${getStatusColor()}`}
          aria-live="polite"
          aria-label={`Time remaining: ${formatTime(timeRemaining)}`}
          data-testid="text-time-remaining"
        >
          {formatTime(timeRemaining)}
        </div>
      </div>
    </div>
  );
}
