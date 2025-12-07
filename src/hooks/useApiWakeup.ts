import { useEffect } from "react";

// Hook para ativar a API ao acessar o site (evita que entre em stand-by)
export function useApiWakeup() {
  useEffect(() => {
    const wakeupApi = async () => {
      try {
        console.log('Ativando API...');
        await fetch('https://mariela-pdv-backend.onrender.com/api/vitrine');
        console.log('API ativada com sucesso');
      } catch (error) {
        console.error('Erro ao ativar API:', error);
      }
    };

    wakeupApi();
  }, []);
}
