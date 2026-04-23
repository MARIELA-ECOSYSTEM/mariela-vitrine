import { Header } from "@/components/Header";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { CategoryNav } from "@/components/CategoryNav";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { QuickActions } from "@/components/QuickActions";
import { Footer } from "@/components/Footer";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";
import { updateSeo } from "@/lib/seo";
import { vitrineApiService } from "@/services/vitrineApiService";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const Index = () => {
  const { loading, produtos } = useProducts();

  useEffect(() => {
    vitrineApiService.getConfig().then((config) => {
      updateSeo({
        title: `${config.nomeLoja} | Moda Feminina`,
        description: `Confira novidades, coleções e peças selecionadas da ${config.nomeLoja}.`,
        image: config.logoUrl || produtos[0]?.imagens[0],
        url: window.location.origin,
      });
    });
  }, [produtos]);

  return (
    <div className="min-h-screen bg-background pt-[60px] sm:pt-[68px]">
      {loading && <LoadingOverlay />}
      <WelcomeDialog />
      <Header />
      <HeroBannerCarousel />
      <CategoryNav />

      <FeaturedProducts
        title="Novidades"
        subtitle="Recém-chegadas à coleção"
        filter="novidades"
        limit={8}
        linkTo="/products?filter=novidades"
        linkLabel="Ver todas as novidades"
      />
      <FeaturedProducts
        title="Promoções"
        subtitle="Descontos em peças selecionadas"
        filter="promocoes"
        limit={4}
        linkTo="/products?filter=promocoes"
        linkLabel="Ver todas as promoções"
      />
      <QuickActions />
      <Footer />
    </div>
  );
};

export default Index;
