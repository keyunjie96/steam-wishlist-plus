import { FunctionComponent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface StatusMessageProps {
  message: string;
  type: 'success' | 'error' | '';
  autoHideMs?: number;
  onHide?: () => void;
}

export const StatusMessage: FunctionComponent<StatusMessageProps> = ({
  message,
  type,
  autoHideMs = 3000,
  onHide,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (type && message && autoHideMs > 0 && onHide) {
      timerRef.current = setTimeout(() => onHide(), autoHideMs);
      return () => clearTimeout(timerRef.current);
    }
    return undefined;
  }, [message, type, autoHideMs, onHide]);

  if (!type || !message) return null;

  return (
    <div class={`swp-status swp-status-${type}`} role="alert" aria-live="polite">
      {message}
    </div>
  );
};
