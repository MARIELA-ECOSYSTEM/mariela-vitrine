import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { vitrineApiService, type ColecaoDestaque } from "@/services/vitrineApiService";
import { cn } from "@/lib/utils";

/**
 * Atalhos rápidos por coleção em destaque — substitui a navegação
 * antiga por categorias. Renderiza chips horizontais com a capa da
 * coleção. Silenciosa em erro/lista vazia (retorna null).
 */
function buildHref(search: string, c: { id: string; nome: string }): string {
  const params = new URLSearchParams();
  try {
    new URLSearchParams(search).forEach((v, k) => {
      if (k.toLowerCase().startsWith("utm_")) params.set(k, v);
    });
  } catch { /* ignore */ }
  if (c.id) params.set("colecaoId", c.id);
  else params.set("colecao", c.nome);
  return `/products?${params.toString()}`;
}

export const CollectionShortcuts = () => {
  const [colecoes, setColecoes] = useState<ColecaoDestaque[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { search } = useLocation();

  useEffect(() => {
    let cancelled = false;
    vitrineApiService
      .getColecoesDestaque()
      .then((items) => { if (!cancelled) setColecoes(items); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (colecoes === null && !failed) {
    return (
      <section className="py-4 sm:py-6 bg-background" aria-hidden>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex gap-3 sm:gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 min-w-[64px] sm:min-w-[80px]">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted animate-pulse" />
                <div className="h-2.5 w-12 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (failed || !colecoes || colecoes.length === 0) return null;

  return (
    <section className="py-4 sm:py-6 bg-background" aria-label="Coleções em destaque">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-1 scrollbar-hide justify-start sm:justify-center">
          <Link
            to="/products"
            className="flex flex-col items-center gap-1.5 min-w-[64px] sm:min-w-[80px] group"
            aria-label="Ver todos os produtos"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-md ring-2 ring-primary/30">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <span className="text-[10px] sm:text-xs text-primary font-semibold whitespace-nowrap">
              Ver Todos
            </span>
          </Link>

          {colecoes.map((c) => {
            const href = buildHref(search, c);
            return (
              <Link
                key={c.id}
                to={href}
                aria-label={`Ver coleção ${c.nome}`}
                className="flex flex-col items-center gap-1.5 min-w-[64px] sm:min-w-[80px] group"
              >
                <div
                  className={cn(
                    "w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-secondary border border-border",
                    "group-hover:border-primary/40 group-hover:scale-110 transition-all duration-300 shadow-sm",
                  )}
                  style={c.cor_destaque ? { boxShadow: `0 0 0 2px ${c.cor_destaque}33` } : undefined}
                >
                  {c.imagem_capa_url ? (
                    <img
                      src={c.imagem_capa_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">✨</div>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-primary transition-colors font-medium whitespace-nowrap max-w-[80px] truncate">
                  {c.nome}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
