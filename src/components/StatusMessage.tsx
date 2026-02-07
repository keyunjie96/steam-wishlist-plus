import { h, useLayoutEffect, useRef, type FunctionComponent } from '../preact';

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
  onHide
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (type && message && autoHideMs > 0) {
      timerRef.current = setTimeout(() => onHide?.(), autoHideMs);
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
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
