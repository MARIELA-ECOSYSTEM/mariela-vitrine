import { useEffect, useState } from "react";
import { vitrineApiService } from "@/services/vitrineApiService";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Activity, Server, Database, ShoppingBag, Layers, Layout, Heart } from "lucide-react";

interface HealthStatus {
  name: string;
  status: "ok" | "error" | "loading";
  details?: string;
  endpoint: string;
}

const Health = () => {
  const [statuses, setStatuses] = useState<HealthStatus[]>([
    { name: "API de Produção (Proxy)", status: "loading", endpoint: "/health" },
    { name: "Produtos", status: "loading", endpoint: "/produtos" },
    { name: "Home Blocks", status: "loading", endpoint: "/home/blocks" },
    { name: "Coleções", status: "loading", endpoint: "/colecoes" },
    { name: "Categorias", status: "loading", endpoint: "/categorias" },
    { name: "Monte Seu Look", status: "loading", endpoint: "/monte-seu-look" },
    { name: "Configuração da Loja", status: "loading", endpoint: "/config" },
  ]);

  useEffect(() => {
    const checkHealth = async () => {
      const results: HealthStatus[] = [];

      const check = async (name: string, endpoint: string, fn: () => Promise<any>) => {
        try {
          const data = await fn();
          const hasData = Array.isArray(data) ? data.length > 0 : !!data;
          results.push({ 
            name, 
            status: "ok", 
            details: hasData ? "Recebendo dados reais" : "API retornou vazio (sem dados ativos)",
            endpoint
          });
        } catch (e) {
          results.push({ 
            name, 
            status: "error", 
            details: e instanceof Error ? e.message : "Erro interno no PDV (500)",
            endpoint
          });
        }
      };

      await Promise.all([
        check("API de Produção (Proxy)", "/health", () => vitrineApiService.getConfig()),
        check("Produtos", "/produtos", () => vitrineApiService.getProdutos({ limit: 1 })),
        check("Home Blocks", "/home/blocks", () => vitrineApiService.getHomeBlocks()),
        check("Coleções", "/colecoes", () => vitrineApiService.getColecoes()),
        check("Categorias", "/categorias", () => vitrineApiService.getCategorias()),
        check("Monte Seu Look", "/monte-seu-look", () => vitrineApiService.getMonteSeuLook()),
        check("Configuração da Loja", "/config", () => vitrineApiService.getConfig()),
      ]);

      setStatuses(results);
    };

    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-2 mb-8">
            <Activity className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-serif font-bold">Healthcheck de Integração</h1>
          </div>

          <div className="grid gap-4">
            {statuses.map((status, index) => (
              <Card key={index} className="overflow-hidden border-border/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      status.status === "ok" ? "bg-green-500/10 text-green-600" : 
                      status.status === "error" ? "bg-red-500/10 text-red-600" : 
                      "bg-muted text-muted-foreground"
                    }`}>
                      {status.name.includes("API") ? <Server className="w-5 h-5" /> : 
                       status.name.includes("Produtos") ? <ShoppingBag className="w-5 h-5" /> :
                       status.name.includes("Blocks") ? <Layout className="w-5 h-5" /> :
                       status.name.includes("Coleções") ? <Layers className="w-5 h-5" /> :
                       status.name.includes("Look") ? <Heart className="w-5 h-5" /> :
                       <Database className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{status.name}</h3>
                      <p className="text-sm text-muted-foreground">{status.details || "Verificando..."}</p>
                      <code className="text-[10px] text-muted-foreground/60">{status.endpoint}</code>
                    </div>
                  </div>
                  <div>
                    {status.status === "ok" ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Online
                      </Badge>
                    ) : status.status === "error" ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" /> Offline
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="animate-pulse">Verificando...</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Health;
