import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageContainer } from "@/components/PageContainer";
import { MobileLookBuilder } from "@/components/MobileLookBuilder";
import { useMonteSeuLookData } from "@/hooks/useMonteSeuLookData";
import { LookSuggestionsSection } from "@/components/LookSuggestionsSection";

const MonteSeuLook = () => {
  const { data, loading } = useMonteSeuLookData();
  const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugLooks") === "1";

  if (import.meta.env.DEV && isDebug) {
    console.group("[MonteSeuLook] Debug Data");
    console.log("Suggestions:", data.sugestoes);
    console.log("Manual Looks:", data.looks_manuais);
    console.groupEnd();
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-secondary/10 to-background pt-[60px] sm:pt-[68px]">
      <Header />
      <main className="flex-1">
        <PageContainer>
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
          
          <div className="max-w-6xl mx-auto space-y-12">
            {data.sugestoes.length > 0 && (
              <LookSuggestionsSection sugestoes={data.sugestoes} />
            )}

            <MobileLookBuilder />
          </div>
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
};

export default MonteSeuLook;
