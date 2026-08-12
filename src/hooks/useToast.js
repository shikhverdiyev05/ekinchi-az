import { useCallback, useEffect, useRef, useState } from "react";
import { describeError } from "../utils/errors";

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const hide = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  const show = useCallback((message, type = "success") => {
    clearTimer();
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), type === "error" ? 6000 : 3000);
  }, []);

  const showError = useCallback(
    (context, error, fallback) => {
      show(describeError(context, error, fallback), "error");
    },
    [show]
  );

  return { toast, show, showError, hide };
}
