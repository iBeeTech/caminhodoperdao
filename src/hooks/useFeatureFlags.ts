import { useState, useEffect } from "react";

interface FeatureFlag {
  id: string;
  name: string;
  enabled: number | boolean;
  description?: string;
}

interface ApiResponse {
  status: number;
  response: string;
  data: FeatureFlag;
}

export const useFeatureFlags = (flagName: string) => {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeatureFlag = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/feature-flags?name=${encodeURIComponent(flagName)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch feature flag: ${response.statusText}`);
        }

        const apiResponse: ApiResponse = await response.json();
        const data = apiResponse.data;
        // SQLite retorna 0 ou 1, precisamos converter para boolean
        const enabled = typeof data.enabled === 'number' 
          ? data.enabled === 1 
          : Boolean(data.enabled);
        setIsEnabled(enabled);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Feature flag error:", errorMessage);
        setError(errorMessage);
        // Default to true (show the feature) if there's an error
        setIsEnabled(true);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatureFlag();
  }, [flagName]);

  return { isEnabled, loading, error };
};
