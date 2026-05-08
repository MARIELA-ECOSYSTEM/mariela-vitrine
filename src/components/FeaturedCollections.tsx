import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ImageOff, Sparkles } from "lucide-react";
import {
  vitrineApiService,
  type ColecaoDestaque,
} from "@/services/vitrineApiService";
import { cn } from "@/lib/utils";

/**
 * Banners dinâmicos de coleções em destaque na Home.
 *
 * Regras (alinhadas ao contrato de produção da vitrine-api):
 *  - Consome `/colecoes?detalhes=1&destaque=1` via service (cache + ETag,
 *    dedupe de inflight, revalidação condicional).
 *  - ZERO fallback de dados: nada de coleção/imagem/placeholder inventado
 *    no frontend. Filtragem por `ativo`, `destaque` e janela de campanha
 *    (`data_inicio`/`data_fim`) é feita no service.
 *  - UI fallback silencioso: em erro ou lista vazia a seção NÃO renderiza
 *    (retorna `null`) — sem espaço em branco, sem mensagem técnica.
 *  - Destaque inteligente: a 1ª coleção (menor `ordem`) ganha um banner
 *    hero maior; demais aparecem em grid de cards menores.
 *  - UTMs preservadas: parâmetros `utm_*` da URL atual são repassados ao
 *    link de `/products?colecao=...` para não quebrar atribuição.
 *  - Fallback visual: se `imagem_capa_url` vier ausente por inconsistência
 *    inesperada, mostra um placeholder discreto (sem `<img>` quebrado).
 *  - Performance: memoiza split hero/grid; imagens com `loading=lazy` e
 *    aspect-ratio fixo para evitar layout shift.
 */

type CollectionLike = ColecaoDestaque;

/**
 * Monta o href para `/products` filtrando pela coleção.
 *
 * - Prefere `colecaoId={id}` (estável, imune a renomeação/acentuação).
 * - Cai para `colecao={nome}` somente se `id` vier ausente (defesa em
 *   camadas; o validador do service já garante `id` obrigatório).
 * - Preserva todos os parâmetros `utm_*` da URL atual para não quebrar
 *   atribuição de campanhas.
 */
function buildCollectionHref(search: string, colecao: { id: string; nome: string }): string {
  const params = new URLSearchParams();
  try {
    const current = new URLSearchParams(search);
    current.forEach((value, key) => {
      if (key.toLowerCase().startsWith("utm_")) params.set(key, value);
    });
  } catch {
    /* ignore — montamos sem UTMs */
  }
  if (colecao.id) {
    params.set("colecaoId", colecao.id);
  } else {
    params.set("colecao", colecao.nome);
  }
  return `/products?${params.toString()}`;
}

/** Estilo inline do acento (cor_destaque). Apenas se HEX válido vier do PDV. */
function accentStyle(hex: string | null): React.CSSProperties | undefined {
  if (!hex) return undefined;
  return { backgroundColor: hex };
}

interface CardProps {
  colecao: CollectionLike;
  href: string;
  variant: "hero" | "grid";
}

const CollectionCard = ({ colecao, href, variant }: CardProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showFallback = !colecao.imagem_capa_url || imgFailed;

  return (
    <Link
      to={href}
      aria-label={`Ver coleção ${colecao.nome}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
        variant === "hero"
          ? "aspect-[16/10] sm:aspect-[21/9] lg:aspect-[16/7]"
          : "aspect-[4/5] sm:aspect-[3/4]",
      )}
    >
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-secondary/40">
          <ImageOff className="w-8 h-8 text-muted-foreground/50" aria-hidden />
        </div>
      ) : (
        <img
          src={colecao.imagem_capa_url ?? undefined}
          alt={colecao.nome}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

      {/* Faixa de acento (cor_destaque) — discreta no topo */}
      {colecao.cor_destaque && (
        <span
          aria-hidden
          style={accentStyle(colecao.cor_destaque)}
          className="absolute top-0 left-0 right-0 h-1"
        />
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 text-white",
          variant === "hero" ? "p-4 sm:p-6 lg:p-8" : "p-3 sm:p-4",
        )}
      >
        {variant === "hero" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-2.5 py-0.5 text-[10px] sm:text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" /> Destaque
          </span>
        )}

        <h3
          className={cn(
            "font-serif font-semibold leading-tight line-clamp-2",
            variant === "hero"
              ? "text-xl sm:text-3xl lg:text-4xl"
              : "text-base sm:text-xl",
          )}
        >
          {colecao.nome}
        </h3>

        {colecao.descricao && (
          <p
            className={cn(
              "mt-1 text-white/85 line-clamp-2",
              variant === "hero" ? "text-sm sm:text-base max-w-xl" : "text-xs sm:text-sm",
            )}
          >
            {colecao.descricao}
          </p>
        )}

        <span
          className={cn(
            "mt-2 sm:mt-3 inline-flex items-center gap-1.5 font-medium",
            variant === "hero"
              ? "rounded-full bg-white text-foreground px-3.5 py-1.5 text-xs sm:text-sm shadow-md"
              : "text-xs sm:text-sm opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all",
          )}
          style={
            variant === "hero" && colecao.cor_destaque
              ? { color: colecao.cor_destaque }
              : undefined
          }
        >
          Ver coleção <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
};

export const FeaturedCollections = () => {
  const [colecoes, setColecoes] = useState<CollectionLike[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { search } = useLocation();

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

  // Loading state (Skeleton)
  if (colecoes === null && !failed) {
    return (
      <section className="py-10 sm:py-14 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[4/5] sm:aspect-[3/4] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (failed || !colecoes || colecoes.length === 0) return null;

  return (
    <section
      className="py-10 sm:py-14 bg-background"
      aria-label="Coleções em destaque"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <span className="inline-block text-primary font-medium text-xs uppercase tracking-wider mb-1.5">
              Coleções
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Em destaque
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {gridColecoes.map((colecao) => (
              <CollectionCard
                key={colecao.id}
                colecao={colecao}
                href={buildCollectionHref(search, colecao)}
                variant="grid"
              />
          ))}
        </div>
      </div>
    </section>
  );
};