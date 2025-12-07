import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MobileLookBuilder } from "@/components/MobileLookBuilder";

const MonteSeuLook = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-secondary/10 to-background">
      <Header />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-12">
          <Breadcrumbs currentPage="Monte Seu Look" />
          
          {/* Hero header - Compact on mobile */}
          <div className="text-center mb-6 md:mb-10 animate-fade-in">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-2 md:mb-4 tracking-tight">
              Monte Seu Look
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Combine as peças e visualize seu look perfeito
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <MobileLookBuilder />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MonteSeuLook;
