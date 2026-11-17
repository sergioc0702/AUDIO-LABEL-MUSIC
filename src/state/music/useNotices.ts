import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The two kinds of messages at the bottom of the screen: an error, which may
 * offer to try again, and a short notice that hides itself.
 */
export function useNotices() {
  const [errorMessage, setErrorMessageState] = useState<string | null>(null);
  const [errorRetryAction, setErrorRetryAction] = useState<(() => void) | null>(
    null,
  );
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const queueNoticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setErrorMessage = useCallback((message: string | null) => {
    setErrorMessageState(message);
    setErrorRetryAction(null);
  }, []);
  const setRetryableError = useCallback(
    (message: string, retryAction: () => void) => {
      setErrorMessageState(message);
      setErrorRetryAction(() => retryAction);
    },
    [],
  );
  const showQueueNotice = useCallback((message: string) => {
    if (queueNoticeTimeout.current) {
      clearTimeout(queueNoticeTimeout.current);
    }
    setQueueNotice(message);
    queueNoticeTimeout.current = setTimeout(() => {
      setQueueNotice(null);
      queueNoticeTimeout.current = null;
    }, 2500);
  }, []);

  useEffect(
    () => () => {
      if (queueNoticeTimeout.current) {
        clearTimeout(queueNoticeTimeout.current);
      }
    },
    [],
  );

  return {
    errorMessage,
    errorRetryAction,
    setErrorMessage,
    setRetryableError,
    queueNotice,
    showQueueNotice,
  };
}

export type Notices = ReturnType<typeof useNotices>;
