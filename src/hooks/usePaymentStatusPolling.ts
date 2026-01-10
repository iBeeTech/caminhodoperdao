import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["paymentStatus", email],
    queryFn: () => landingService.checkStatus(email),
    enabled: enabled && !!email,
    refetchInterval: enabled && !!email ? 3000 : false, // Poll a cada 3 segundos
    refetchIntervalInBackground: true, // Continua mesmo em background
    staleTime: 0, // Sempre considera stale para forçar refetch
    retry: true,
    retryDelay: 1000,
  });

  // Detectar mudanças de status
  useEffect(() => {
    if (data?.status && data.status !== previousStatusRef.current) {
      previousStatusRef.current = data.status;
      onStatusChange?.(data.status);
    }
  }, [data?.status, onStatusChange]);

  return {
    status: data?.status ?? null,
    isLoading,
    error,
    data,
  };
};
