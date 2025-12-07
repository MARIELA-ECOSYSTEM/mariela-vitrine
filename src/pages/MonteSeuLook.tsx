import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { VirtualMannequin } from "@/components/VirtualMannequin";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";

const MonteSeuLook = () => {
  const { loading } = useProducts();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-secondary/10 to-background">
      {loading && <LoadingOverlay />}
      <Header />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
          <Breadcrumbs currentPage="Monte Seu Look" />
          
          {/* Hero header */}
          <div className="text-center mb-8 md:mb-12 animate-fade-in">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-4 tracking-tight">
              Monte Seu Look
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Selecione as peças e veja como ficam juntas em tempo real
            </p>
          </div>
          
          <div className="max-w-7xl mx-auto">
            <VirtualMannequin />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MonteSeuLook;
