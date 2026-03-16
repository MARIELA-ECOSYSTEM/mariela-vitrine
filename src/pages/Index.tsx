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

      {/* Ver Todos os Produtos - CTA criativo */}
      <section className="py-3 sm:py-4 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <Link
            to="/products"
            className="group flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/15 rounded-xl hover:border-primary/30 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-serif text-base sm:text-lg font-semibold text-foreground">
                  Ver Todos os Produtos
                </p>
                <p className="text-xs text-muted-foreground">
                  {produtos.length} peças disponíveis
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
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
