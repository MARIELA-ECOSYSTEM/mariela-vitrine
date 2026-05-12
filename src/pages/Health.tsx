import { useEffect, useState } from "react";
import { vitrineApiService } from "@/services/vitrineApiService";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Activity, Server, Database, ShoppingBag } from "lucide-react";

interface HealthStatus {
  name: string;
  status: "ok" | "error" | "loading";
  details?: string;
}

const Health = () => {
  const [statuses, setStatuses] = useState<HealthStatus[]>([
    { name: "API de Produção (Proxy)", status: "loading" },
    { name: "Produtos", status: "loading" },
    { name: "Home Blocks", status: "loading" },
    { name: "Coleções", status: "loading" },
    { name: "Configuração da Loja", status: "loading" },
  ]);

  useEffect(() => {
    const checkHealth = async () => {
      const results: HealthStatus[] = [];

      // 1. API Production proxy
      try {
        const config = await vitrineApiService.getConfig();
        results.push({ name: "API de Produção (Proxy)", status: "ok", details: "Conectado via vitrine-api Edge Function" });
        results.push({ name: "Configuração da Loja", status: "ok", details: `Loja: ${config.nomeLoja}` });
      } catch (e) {
        results.push({ name: "API de Produção (Proxy)", status: "error", details: e instanceof Error ? e.message : "Erro desconhecido" });
        results.push({ name: "Configuração da Loja", status: "error", details: "Falha ao carregar config" });
      }

      // 2. Products
      try {
        const products = await vitrineApiService.getProdutos({ limit: 1 });
        results.push({ name: "Produtos", status: "ok", details: `${products.length > 0 ? "Recebendo dados reais" : "API retornou lista vazia"}` });
      } catch (e) {
        results.push({ name: "Produtos", status: "error", details: e instanceof Error ? e.message : "Erro desconhecido" });
      }

      // 3. Home Blocks
      try {
        const blocks = await vitrineApiService.getHomeBlocks();
        results.push({ name: "Home Blocks", status: "ok", details: `${blocks.length} blocos configurados` });
      } catch (e) {
        results.push({ name: "Home Blocks", status: "error", details: e instanceof Error ? e.message : "Erro desconhecido" });
      }

      // 4. Collections
      try {
        const collections = await vitrineApiService.getColecoes();
        results.push({ name: "Coleções", status: "ok", details: `${collections.length} coleções ativas` });
      } catch (e) {
        results.push({ name: "Coleções", status: "error", details: e instanceof Error ? e.message : "Erro desconhecido" });
      }

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
                       <Database className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{status.name}</h3>
                      <p className="text-sm text-muted-foreground">{status.details || "Verificando..."}</p>
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

          <div className="p-6 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Notas Técnicas
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
              <li>A Vitrine utiliza um proxy inteligente na Edge Function <code>vitrine-api</code>.</li>
              <li>Todos os dados são provenientes do PDV real (Pyramid).</li>
              <li>Cache agressivo (TTL 1-5min) é aplicado para performance.</li>
              <li>Endpoints testados: <code>/config</code>, <code>/produtos</code>, <code>/home/blocks</code>, <code>/colecoes</code>.</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Health;
