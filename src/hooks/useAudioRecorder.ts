import { useCallback, useEffect, useRef, useState } from "react";

// Limite de gravação dos testemunhos: 3 minutos. Deixar explícito na página.
export const MAX_RECORDING_SECONDS = 180;

export type RecorderStatus = "idle" | "recording" | "recorded" | "denied" | "unsupported";

interface UseAudioRecorderResult {
  status: RecorderStatus;
  elapsedSeconds: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// Escolhe um container suportado pelo navegador. iPhone/Safari grava em mp4/aac;
// Chrome/Firefox em webm/opus. Whisper aceita ambos.
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, [clearTimer]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setStatus("recorded");
        stopStream();
      };

      recorderRef.current = recorder;
      setAudioBlob(null);
      setElapsedSeconds(0);
      recorder.start();
      setStatus("recording");

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            // Auto-encerra ao bater 3 minutos.
            stop();
            return MAX_RECORDING_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch {
      setStatus("denied");
      stopStream();
    }
  }, [stop, stopStream]);

  const reset = useCallback(() => {
    clearTimer();
    stopStream();
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAudioBlob(null);
    setElapsedSeconds(0);
    setStatus("idle");
    setError(null);
  }, [clearTimer, stopStream]);

  // Limpeza ao desmontar: para timer, stream e libera a URL do blob.
  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [clearTimer, stopStream]);

  return { status, elapsedSeconds, audioBlob, audioUrl, error, start, stop, reset };
}
