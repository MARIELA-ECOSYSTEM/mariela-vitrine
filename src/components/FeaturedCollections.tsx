import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { vitrineApiService, type ColecaoDestaque } from "@/services/vitrineApiService";

/**
 * Seção de coleções em destaque na home.
 *
 * Regras (alinhadas ao contrato de produção da vitrine):
 *  - Consome `/colecoes?detalhes=1&destaque=1` via service (cache + ETag).
 *  - ZERO fallback de dados: nada de coleção/imagem/placeholder inventado.
 *  - UI fallback silencioso: em erro ou lista vazia a seção NÃO renderiza
 *    (retorna `null`) — sem espaço em branco, sem mensagem técnica.
 *  - Layout estável: enquanto carrega, também não ocupa espaço, evitando
 *    "saltos" visuais na home.
 *  - Usa apenas campos do contrato público: id, nome, descricao,
 *    imagem_capa_url, destaque, ordem (ordenação já vem do service).
 *  - Coleções sem capa válida são descartadas para não quebrar o layout
 *    de imagens.
 */
export const FeaturedCollections = () => {
  const [colecoes, setColecoes] = useState<ColecaoDestaque[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    vitrineApiService
      .getColecoesDestaque()
      .then((items) => {
        if (cancelled) return;
        setColecoes(items);
      })
      .catch(() => {
        if (cancelled) return;
        // UI fallback: esconde a seção. Não logar erro técnico ao usuário.
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Estado inicial / falha / lista vazia → não renderiza nada.
  if (failed || colecoes === null) return null;

  const visiveis = colecoes.filter((c) => c.imagem_capa_url);
  if (visiveis.length === 0) return null;

  return (
    <section className="py-10 sm:py-14 bg-background" aria-label="Coleções em destaque">
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

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {visiveis.map((colecao) => (
            <Link
              key={colecao.id}
              to={`/products?colecao=${encodeURIComponent(colecao.nome)}`}
              className="group relative overflow-hidden rounded-xl bg-muted aspect-[4/5] sm:aspect-[3/4] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img
                src={colecao.imagem_capa_url ?? undefined}
                alt={colecao.nome}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
                <h3 className="font-serif text-base sm:text-xl font-semibold leading-tight line-clamp-2">
                  {colecao.nome}
                </h3>
                {colecao.descricao && (
                  <p className="mt-1 text-xs sm:text-sm text-white/85 line-clamp-2">
                    {colecao.descricao}
                  </p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 text-xs sm:text-sm font-medium opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                  Ver peças <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};