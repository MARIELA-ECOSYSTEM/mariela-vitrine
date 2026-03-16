import { Header } from "@/components/Header";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { CategoryNav } from "@/components/CategoryNav";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { QuickActions } from "@/components/QuickActions";
import { Footer } from "@/components/Footer";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { loading, produtos } = useProducts();

  return (
    <div className="min-h-screen bg-background">
      {loading && <LoadingOverlay />}
      <WelcomeDialog />
      <Header />
      <HeroBannerCarousel />
      <CategoryNav />

      {/* Ver Todos os Produtos - CTA moderno */}
      <section className="py-3 sm:py-5 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <Link
            to="/products"
            className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent p-[1px] shadow-sm hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex items-center justify-between w-full rounded-[15px] bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center group-hover:from-primary/25 group-hover:to-accent/25 transition-colors">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-serif text-sm sm:text-base font-semibold text-foreground leading-tight">
                    Explorar Catálogo
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    {produtos.length} peças • Novidades toda semana
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <ArrowRight className="h-4 w-4 text-primary group-hover:text-primary-foreground group-hover:translate-x-0.5 transition-all duration-300" />
              </div>
            </div>
          </Link>
        </div>
      </section>

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
