import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ImageOff, Sparkles, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageContainer } from "@/components/PageContainer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SEOMeta } from "@/components/seo/SEOMeta";
import { Input } from "@/components/ui/input";
import { vitrineApiService, type ColecaoDestaque } from "@/services/vitrineApiService";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

/**
 * Página /colecoes — vitrine editorial de todas as coleções publicadas.
 * Layout magazine: 1ª coleção em hero asimétrico full-width, demais em grid
 * intercalado (tall/wide) para quebrar a monotonia e dar tom de boutique.
 */
const Colecoes = () => {
  const [colecoes, setColecoes] = useState<ColecaoDestaque[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    vitrineApiService
      .getColecoesDestaque()
      .then((items) => {
        if (!cancelled) setColecoes(items);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!colecoes) return [];
    const q = query.trim().toLowerCase();
    if (!q) return colecoes;
    return colecoes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.descricao || "").toLowerCase().includes(q),
    );
  }, [colecoes, query]);

  const [hero, ...rest] = filtered;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOMeta
        title="Coleções | Mariela Moda Feminina"
        description="Explore todas as coleções da Mariela Moda Feminina — curadoria sazonal de vestidos, conjuntos e blusas para a mulher contemporânea."
      />
      <Header />

      <main className="flex-grow pt-[var(--header-height)]">
        {/* Cabeçalho editorial */}
        <section className="border-b border-border/60 bg-gradient-to-b from-secondary/30 via-background to-background">
          <PageContainer className="py-10 sm:py-16">
            <Breadcrumbs currentPage="Coleções" />
            <div className="mt-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-primary font-semibold">
                  <Sparkles className="w-3 h-3" /> Curadoria Mariela
                </span>
                <h1 className="mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-foreground">
                  Nossas{" "}
                  <span className="italic text-primary">coleções</span>
                </h1>
                <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Cada coleção é um capítulo. Tecidos, cortes e cores escolhidos
                  a dedo para traduzir momentos da mulher real.
                </p>
              </div>

              <div className="relative w-full lg:w-80 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar coleção..."
                  className="pl-9 h-11 rounded-full bg-background border-border/70"
                  aria-label="Buscar coleções"
                />
              </div>
            </div>
          </PageContainer>
        </section>

        <PageContainer className="py-10 sm:py-16">
          {/* Loading */}
          {colecoes === null && !failed && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-3 aspect-[16/8] rounded-2xl bg-muted animate-pulse" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty / failed */}
          {(failed || (colecoes && filtered.length === 0)) && (
            <div className="text-center py-20">
              <ImageOff className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" aria-hidden />
              <p className="font-serif text-xl text-foreground">
                {failed ? "Não foi possível carregar as coleções." : "Nenhuma coleção encontrada."}
              </p>
              {!failed && query && (
                <button
                  onClick={() => setQuery("")}
                  className="mt-3 text-sm text-primary underline underline-offset-4"
                >
                  Limpar busca
                </button>
              )}
            </div>
          )}

          {/* Conteúdo */}
          {colecoes && filtered.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              {hero && <HeroCard colecao={hero} />}
              {rest.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                  {rest.map((c, i) => (
                    <CollectionTile
                      key={c.id}
                      colecao={c}
                      // Quebra ritmo: cada 5º card ocupa duas colunas no desktop.
                      wide={i % 5 === 4}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </PageContainer>
      </main>

      <Footer />
    </div>
  );
};

export default Colecoes;

/* ------------------------ Cards ------------------------ */

function collectionHref(colecao: ColecaoDestaque): string {
  return `/collections/${slugify(colecao.nome) || colecao.id}`;
}

const HeroCard = ({ colecao }: { colecao: ColecaoDestaque }) => {
  const img = colecao.banner_url || colecao.imagem_capa_url;
  return (
    <Link
      to={collectionHref(colecao)}
      aria-label={`Ver coleção ${colecao.nome}`}
      className="group relative block overflow-hidden rounded-2xl aspect-[16/10] sm:aspect-[21/9] lg:aspect-[21/8] bg-muted"
    >
      {img ? (
        <img
          src={img}
          alt={colecao.nome}
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff className="w-10 h-10 text-muted-foreground/40" aria-hidden />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />
      {colecao.cor_destaque && (
        <span
          aria-hidden
          style={{ backgroundColor: colecao.cor_destaque }}
          className="absolute top-0 left-0 right-0 h-1"
        />
      )}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-14 text-white">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.2em] mb-4">
          <Sparkles className="w-3 h-3" /> Em destaque
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl lg:text-7xl font-light leading-[1.05] max-w-3xl">
          {colecao.nome}
        </h2>
        {colecao.descricao && (
          <p className="mt-3 text-sm sm:text-base lg:text-lg text-white/85 max-w-xl line-clamp-3 italic">
            "{colecao.descricao}"
          </p>
        )}
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium border-b border-white/60 pb-1 self-start group-hover:border-white transition-colors">
          Explorar coleção
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
};

const CollectionTile = ({
  colecao,
  wide,
}: {
  colecao: ColecaoDestaque;
  wide?: boolean;
}) => {
  const img = colecao.banner_url || colecao.imagem_capa_url;
  return (
    <Link
      to={collectionHref(colecao)}
      aria-label={`Ver coleção ${colecao.nome}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl bg-muted",
        wide ? "col-span-2 aspect-[16/9]" : "aspect-[4/5]",
      )}
    >
      {img ? (
        <img
          src={img}
          alt={colecao.nome}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff className="w-8 h-8 text-muted-foreground/40" aria-hidden />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      {colecao.cor_destaque && (
        <span
          aria-hidden
          style={{ backgroundColor: colecao.cor_destaque }}
          className="absolute top-0 left-0 right-0 h-[3px]"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 text-white">
        <h3 className="font-serif text-base sm:text-2xl font-medium leading-tight line-clamp-2">
          {colecao.nome}
        </h3>
        {colecao.descricao && (
          <p className="mt-1 text-xs sm:text-sm text-white/85 line-clamp-2 hidden sm:block">
            {colecao.descricao}
          </p>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] sm:text-xs uppercase tracking-[0.2em] opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          Ver coleção <ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
};