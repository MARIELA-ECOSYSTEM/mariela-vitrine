import { Header } from "@/components/Header";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { CategoryNav } from "@/components/CategoryNav";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { QuickActions } from "@/components/QuickActions";
import { Footer } from "@/components/Footer";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";
import { absoluteUrl, updateSeo } from "@/lib/seo";
import { vitrineApiService } from "@/services/vitrineApiService";
import { useEffect, useMemo } from "react";
import type { Produto } from "@/data/products";

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

  const novidadesRecentes = useMemo(() => {
    const parseTimestamp = (value?: string | null): number | null => {
      if (!value) return null;
      const ts = new Date(value).getTime();
      return Number.isFinite(ts) && ts > 0 ? ts : null;
    };

    const idDesc = (a: Produto, b: Produto) => Number(b.id) - Number(a.id);

    const comData = disponiveis
      .map((p) => ({ p, ts: parseTimestamp(p.createdAt) }))
      .filter((entry): entry is { p: Produto; ts: number } => entry.ts !== null);

    if (comData.length > 0) {
      // Ordenação estável: data desc, desempate por id desc
      comData.sort((a, b) => (b.ts - a.ts) || idDesc(a.p, b.p));
      return comData.slice(0, 6).map((entry) => entry.p);
    }

    // Fallback determinístico: flag isNovidade quando disponível, senão id desc
    const flagged = disponiveis.filter((p) => p.isNovidade);
    const fallback = flagged.length > 0 ? flagged : disponiveis;
    return [...fallback].sort(idDesc).slice(0, 6);
  }, [disponiveis]);

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
      <QuickActions />
      <Footer />
    </div>
  );
};

export default Index;
