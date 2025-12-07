import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { NewArrivalsSection } from "@/components/NewArrivalsSection";
import { PromotionsSection } from "@/components/PromotionsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";

const Index = () => {
  const { loading } = useProducts();
  
  return (
    <div className="min-h-screen">
      {loading && <LoadingOverlay />}
      <WelcomeDialog />
      <Header />
      <Hero />
      <NewArrivalsSection />
      <PromotionsSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
