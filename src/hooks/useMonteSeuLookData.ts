import { useState, useEffect } from "react";
import { MonteSeuLookData } from "@/data/products";
import { vitrineApiService } from "@/services/vitrineApiService";

export function useMonteSeuLookData() {
  const [data, setData] = useState<MonteSeuLookData>({ sugestoes: [], looks_manuais: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    vitrineApiService.getMonteSeuLookData()
      .then((res) => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}