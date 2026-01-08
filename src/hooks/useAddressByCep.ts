import { useState, useCallback } from "react";

export interface Address {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  error?: string;
}

export const useAddressByCep = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddress = useCallback(async (cep: string): Promise<Address | null> => {
    // Remover formatação
    const cleanCep = cep.replace(/\D/g, "");

    // Validar se tem 8 dígitos
    if (cleanCep.length !== 8) {
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      
      if (!response.ok) {
        throw new Error("Erro ao buscar CEP");
      }

      const data = await response.json();

      // ViaCEP retorna erro como { erro: true }
      if (data.erro) {
        setError("CEP não encontrado");
        return null;
      }

      return {
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar CEP";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchAddress, loading, error };
};
