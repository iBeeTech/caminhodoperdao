import { useEffect, useRef, useState } from "react";
import { landingService } from "../services/landing/landing.service";

interface UsePaymentStatusPollingProps {
  email: string;
  enabled: boolean;
  onStatusChange?: (status: string) => void;
}

/**
 * Hook para fazer polling do status do pagamento
 * Monitora continuamente o status de um pagamento e executa callback quando status muda
 */
export const usePaymentStatusPolling = ({
  email,
  enabled,
  onStatusChange,
}: UsePaymentStatusPollingProps) => {
  const previousStatusRef = useRef<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !email) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Função para fazer a requisição
    const pollStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await landingService.checkStatus(email);
        setData(response);

        // Detectar mudanças de status
        if (response?.status && response.status !== previousStatusRef.current) {
          previousStatusRef.current = response.status;
          onStatusChange?.(response.status);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    // Fazer primeira requisição imediatamente
    pollStatus();

    // Configurar polling a cada 3 segundos
    intervalRef.current = setInterval(pollStatus, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, email, onStatusChange]);

  return {
    status: data?.status ?? null,
    isLoading,
    error,
    data,
  };
};
