import { Header } from "@/components/Header";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { QuickActions } from "@/components/QuickActions";
import { Footer } from "@/components/Footer";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";
import { absoluteUrl, updateSeo } from "@/lib/seo";
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
 
    const isDebugMode = useMemo(() => {
      const params = new URLSearchParams(search);
      return (params.get("debugHome") === "1" || params.get("debugVitrine") === "1");
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

  useEffect(() => {
    vitrineApiService.getConfig().then((config) => {
      const instagramUrl = config.instagram
        ? config.instagram.startsWith("http")
          ? config.instagram
          : `https://www.instagram.com/${config.instagram.replace(/^@/, "")}/`
        : "https://www.instagram.com/marielaloja_/";

      updateSeo({
        title: `${config.nomeLoja} | Moda Feminina em Campina Grande`,
        description: "Loja de roupas femininas em Campina Grande. Confira vestidos, conjuntos, blusas e novidades da coleção.",
        image: config.logoUrl || produtos[0]?.imagens[0],
        url: window.location.origin,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: config.nomeLoja,
          logo: absoluteUrl(config.logoUrl),
          url: window.location.origin,
          telephone: config.whatsapp || "5583986567915",
          sameAs: [instagramUrl],
          address: {
            "@type": "PostalAddress",
            addressLocality: "Campina Grande",
            addressRegion: "PB",
            addressCountry: "BR",
          },
        },
      });
    });
  }, [produtos]);

   return (
     <div className="min-h-screen bg-background">
       {(loadingProducts || loadingBlocks) && <LoadingOverlay />}
       <WelcomeDialog />
       <Header />
        <HeroBannerCarousel />

        <div id="home-content">
           <DynamicHomeRenderer 
             blocks={homeBlocks} 
             loading={loadingBlocks} 
             debug={isDebugMode} 
           />

          {!loadingBlocks && !loadingProducts && homeBlocks.length === 0 && (
            <section className="py-12 sm:py-20 bg-background">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-md mx-auto text-center animate-fade-in">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-secondary/40 flex items-center justify-center mx-auto mb-4">
                    <PackageOpen className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" aria-hidden />
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground mb-2">
                    Aguardando novidades
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-5">
                    Nossa vitrine está sendo atualizada. Volte em instantes para conferir as novas peças e coleções.
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
