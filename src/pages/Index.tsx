import { Header } from "@/components/Header";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { FeaturedCollections } from "@/components/FeaturedCollections";
import { QuickActions } from "@/components/QuickActions";
import { Footer } from "@/components/Footer";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";
import { absoluteUrl, updateSeo } from "@/lib/seo";
import { vitrineApiService } from "@/services/vitrineApiService";
import { useEffect, useMemo } from "react";
import type { Produto } from "@/data/products";
import { selectNovidades, HOME_NOVIDADES_LIMIT } from "@/lib/novidades";
import { Button } from "@/components/ui/button";
import { PackageOpen, RefreshCw } from "lucide-react";

type HomeBadgeFilter = "em_alta" | "mais_procurado" | "queridinho_loja" | "destaque_colecao";

const HOME_BADGE_SECTIONS: Array<{ title: string; subtitle: string; filter: HomeBadgeFilter }> = [
  { title: "Em alta", subtitle: "Peças em destaque na vitrine", filter: "em_alta" },
  { title: "Mais procurados", subtitle: "Escolhas que estão chamando atenção", filter: "mais_procurado" },
  { title: "Queridinhos da loja", subtitle: "Peças queridas pelas clientes", filter: "queridinho_loja" },
  { title: "Destaques da coleção", subtitle: "Seleção especial da vitrine", filter: "destaque_colecao" },
];

function getBadgeValue(produto: Produto) {
  return produto.badgePublico || produto.publicBadge || produto.destaque_publico || produto.recomendacao_publica || null;
}

function isAvailable(produto: Produto) {
  return produto.variants.some((variant) => variant.disponibilidade > 0);
}

const Index = () => {
  const { loading, produtos } = useProducts();

  const disponiveis = useMemo(() => produtos.filter(isAvailable), [produtos]);

  const novidadesRecentes = useMemo(
    () => selectNovidades(disponiveis, HOME_NOVIDADES_LIMIT),
    [disponiveis],
  );

  const homeBadgeSections = useMemo(() => {
    const used = new Set<number>();
    novidadesRecentes.forEach((p) => used.add(p.id));

    return HOME_BADGE_SECTIONS.map((section) => {
      const products = disponiveis
        .filter((produto) => getBadgeValue(produto) === section.filter && !used.has(produto.id))
        .slice(0, 4);

      products.forEach((produto) => used.add(produto.id));
      return { ...section, products };
    }).filter((section) => section.products.length >= 1);
  }, [disponiveis, novidadesRecentes]);

  const isEmpty = !loading && disponiveis.length === 0;

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
      {loading && <LoadingOverlay />}
      <WelcomeDialog />
      <Header />
      <HeroBannerCarousel />
      <FeaturedCollections />

      <div id="products">
      {isEmpty ? (
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
      ) : (
        <>
      <FeaturedProducts
        title="Novidades"
        subtitle="Recém-chegadas à coleção"
        filter="novidades"
        limit={6}
        forceLoading={loading}
        products={loading ? undefined : novidadesRecentes}
        minItems={1}
        linkTo="/products?filter=novidades"
        linkLabel="Ver todas as novidades"
      />
      {loading
        ? HOME_BADGE_SECTIONS.map((section) => (
            <FeaturedProducts
              key={section.filter}
              title={section.title}
              subtitle={section.subtitle}
              filter={section.filter}
              limit={4}
              forceLoading
              products={[]}
              linkTo={`/products?filter=${section.filter}`}
              linkLabel={section.filter === "mais_procurado" ? "Ver mais procurados" : "Ver produtos"}
            />
          ))
        : homeBadgeSections.map((section) => (
            <FeaturedProducts
              key={section.filter}
              title={section.title}
              subtitle={section.subtitle}
              filter={section.filter}
              limit={4}
              minItems={1}
              products={section.products}
              linkTo={`/products?filter=${section.filter}`}
              linkLabel={section.filter === "mais_procurado" ? "Ver mais procurados" : "Ver produtos"}
            />
          ))}
      <FeaturedProducts
        title="Promoções"
        subtitle="Descontos em peças selecionadas"
        filter="promocoes"
        limit={4}
        forceLoading={loading}
        linkTo="/products?filter=promocoes"
        linkLabel="Ver todas as promoções"
      />
        </>
      )}
      </div>
      <QuickActions />
      <Footer />
    </div>
  );
};

export default Index;
