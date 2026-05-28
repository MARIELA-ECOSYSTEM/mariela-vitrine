import { Header } from "@/components/Header";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { FeaturedCollections } from "@/components/FeaturedCollections";
import { QuickActions } from "@/components/QuickActions";
import { Footer } from "@/components/Footer";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";
import { absoluteUrl } from "@/lib/seo";
import { SEOMeta } from "@/components/seo/SEOMeta";
 import { vitrineApiService, HomeBlock } from "@/services/vitrineApiService";
 import { useEffect, useMemo, useState } from "react";
 import type { Produto } from "@/data/products";
 import { useLocation } from "react-router-dom";
 import { DynamicHomeRenderer } from "@/components/DynamicHomeRenderer";
import { Button } from "@/components/ui/button";
import { PackageOpen, RefreshCw } from "lucide-react";

function isAvailable(produto: Produto) {
  return produto.variants.some((variant) => variant.disponibilidade > 0);
}

 const Index = () => {
   const { loading: loadingProducts, produtos } = useProducts();
   const [homeBlocks, setHomeBlocks] = useState<HomeBlock[]>([]);
   const [loadingBlocks, setLoadingBlocks] = useState(true);
   const { search } = useLocation();
 
   const isDebugHome = useMemo(() => {
     const params = new URLSearchParams(search);
     return params.get("debugHome") === "1" && import.meta.env.DEV;
   }, [search]);
 
  const isDebugIntegracao = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("debugIntegracao") === "1";
  }, [search]);

   const disponiveis = useMemo(() => produtos.filter(isAvailable), [produtos]);
   const isEmpty = !loadingBlocks && !loadingProducts && homeBlocks.length === 0 && disponiveis.length === 0;
 
   useEffect(() => {
     let cancelled = false;
     vitrineApiService.getHomeBlocks().then((blocks) => {
       if (!cancelled) {
         setHomeBlocks(blocks);
         setLoadingBlocks(false);
       }
     });
     return () => { cancelled = true; };
   }, []);

    return (
      <div className="min-h-screen bg-background">
        <SEOMeta 
         title="Mariela | Moda Feminina em Campina Grande"
         description="Descubra a melhor curadoria de moda feminina em Campina Grande. Vestidos, conjuntos e blusas com elegância e sofisticação."
         image={produtos[0]?.imagens[0]}
          jsonLd={{
            "@type": "Organization",
            "name": "Mariela Moda Feminina",
            "url": (typeof window !== "undefined" ? window.location.origin : ""),
            "logo": absoluteUrl("/logo.png"),
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Campina Grande",
              "addressRegion": "PB",
              "addressCountry": "BR"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+55-83-98656-7915",
              "contactType": "customer service",
              "areaServed": "BR",
              "availableLanguage": "Portuguese"
            },
            "sameAs": [
              "https://www.instagram.com/marielaloja_/"
            ]
          }}
       />
        <h1 className="sr-only">Mariela Moda Feminina | Loja de Roupas Femininas em Campina Grande</h1>
        {(loadingProducts || loadingBlocks) && <LoadingOverlay />}
        <WelcomeDialog />
        <Header />
       {/* Âncora "home" estável: garante que scroll-spy e scroll programático
           funcionem mesmo se o carrossel não renderizar (sem coleções ativas). */}
       <section id="home" aria-label="Início" className="scroll-mt-20 md:scroll-mt-24">
         <HeroBannerCarousel />
       </section>
 
        <div id="home-content" className="relative">
          {isDebugIntegracao && (
            <div className="bg-black text-green-400 p-4 font-mono text-xs overflow-auto max-h-60 border-b border-green-900/30 sticky top-16 z-50">
              <h3 className="font-bold border-b border-green-900/50 mb-2 pb-1 flex justify-between">
                <span>DIAGNÓSTICO DE INTEGRAÇÃO</span>
                <span className="text-[10px] opacity-50 cursor-pointer" onClick={() => window.location.reload()}>RECARREGAR</span>
              </h3>
              <div className="space-y-1">
                <p>Blocks: {loadingBlocks ? 'carregando...' : `${homeBlocks.length} recebidos`}</p>
                <p>Produtos: {loadingProducts ? 'carregando...' : `${produtos.length} totais, ${disponiveis.length} disponíveis`}</p>
                <p>Status API: {loadingBlocks ? '?' : (homeBlocks.length > 0 ? '200 OK' : 'Vazio ou Erro')}</p>
                <p className="text-green-500 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  CONEXÃO REAL (ZERO MOCK)
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer hover:underline text-[10px]">Ver detalhes dos blocos</summary>
                  <pre className="mt-1 p-2 bg-black/50 rounded">{JSON.stringify(homeBlocks, null, 2)}</pre>
                </details>
              </div>
            </div>
          )}

         {/* Âncora estável para scroll-spy e navegação por hash (#products). */}
         <section id="products" aria-label="Produtos em destaque" className="scroll-mt-20 md:scroll-mt-24">
           <DynamicHomeRenderer 
             blocks={homeBlocks} 
             loading={loadingBlocks} 
             debug={isDebugHome} 
           />
         </section>
 
         {isEmpty && (
           <section className="py-12 sm:py-20 bg-background">
             <div className="container mx-auto px-4 sm:px-6">
               <div className="max-w-md mx-auto text-center animate-fade-in">
                 <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-secondary/40 flex items-center justify-center mx-auto mb-4">
                   <PackageOpen className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" aria-hidden />
                 </div>
                 <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground mb-2">
                   Em breve, novidades por aqui
                 </h2>
                 <p className="text-sm sm:text-base text-muted-foreground mb-5">
                   Estamos preparando nossa próxima coleção. Volte em instantes para conferir as novas peças.
                 </p>
                 <Button
                   variant="outline"
                   size="sm"
                   className="gap-1.5"
                   onClick={() => window.location.reload()}
                 >
                   <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                 </Button>
               </div>
             </div>
           </section>
         )}
       </div>
      <QuickActions />
      <Footer />
    </div>
  );
};

export default Index;
