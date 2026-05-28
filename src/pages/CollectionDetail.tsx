  import { useEffect, useState, useMemo, useCallback, useRef } from "react";
  import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
  import { slugify, isUuidLike } from "@/lib/slug";
 import { Header } from "@/components/Header";
 import { Footer } from "@/components/Footer";
  import { Breadcrumbs } from "@/components/Breadcrumbs";
 import { PageContainer } from "@/components/PageContainer";
 import { ProductCard } from "@/components/ProductCard";
  import { ProductsLoadingSkeleton, ProductSkeleton } from "@/components/ProductSkeleton";
import { ProductFilters, FiltersContent } from "@/components/ProductFilters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
  import { 
    vitrineApiService, 
     type ColecaoDestaque,
     type FilterOption,
     type VitrineConfig
  } from "@/services/vitrineApiService";
  import type { Produto } from "@/data/products";
  import { absoluteUrl } from "@/lib/seo";
  import { SEOMeta } from "@/components/seo/SEOMeta";
import { ArrowLeft, Sparkles, ImageOff, Filter, X, ArrowDown } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";

  // Espelha o mapa do ProductCard para que o filtro visual de cores na
  // coleção use exatamente a mesma paleta dos swatches dos cards.
  const COLOR_SWATCH: Record<string, string> = {
    "Preto": "#000000", "Branco": "#FFFFFF", "Vermelho": "#DC2626",
    "Azul": "#2563EB", "Verde": "#16A34A", "Amarelo": "#EAB308",
    "Rosa": "#EC4899", "Roxo": "#9333EA", "Laranja": "#EA580C",
    "Marrom": "#92400E", "Cinza": "#6B7280", "Bege": "#D4C5B9",
    "Nude": "#E5D4C1", "Caqui": "#BDB76B", "Vinho": "#722F37",
    "Mostarda": "#FFDB58", "Off White": "#F8F8F8", "Caramelo": "#C68642",
  };

  const produtosPorPagina = 12;
 
 const CollectionDetail = () => {
   const { id: slugOrId } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
   const navigate = useNavigate();
   const [colecao, setColecao] = useState<ColecaoDestaque | null>(null);
   const [produtos, setProdutos] = useState<Produto[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(false);
    const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("todas");
    const [ordenarPor, setOrdenarPor] = useState<string>("padrao");
    const [coresSelecionadas, setCoresSelecionadas] = useState<string[]>([]);
    const [tamanhosSelecionados, setTamanhosSelecionados] = useState<string[]>([]);
    const [faixaPreco, setFaixaPreco] = useState<[number, number]>([0, 0]);
    const [precoAlterado, setPrecoAlterado] = useState(false);
    const [paginaAtual, setPaginaAtual] = useState(() => {
      return Number(searchParams.get("page")) || 1;
    });
    const [loadingMore, setLoadingMore] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Estado "rascunho" para filtros mobile
    const [draftFilters, setDraftFilters] = useState<{
      categoria?: string;
      cores?: string[];
      tamanhos?: string[];
      preco?: [number, number];
      precoAlterado?: boolean;
    }>({});
 
   useEffect(() => {
     if (!slugOrId) return;
 
     let active = true;
     setLoading(true);
     setError(false);
 
     const fetchData = async () => {
       try {
         // 1. Buscar a coleção específica
         const colecoes = await vitrineApiService.getColecoesDestaque();
         // Resolução por slug (URL legível), com fallback para id quando
         // o parâmetro for UUID (URLs antigas) ou quando vier hint `?id=`.
         const hintId = searchParams.get("id");
         const match =
           colecoes.find((c) => slugify(c.nome) === slugOrId) ||
           (hintId ? colecoes.find((c) => c.id === hintId) : null) ||
           (isUuidLike(slugOrId) ? colecoes.find((c) => c.id === slugOrId) : null);
         
         if (!match) {
           if (active) setError(true);
           return;
         }
 
         if (active) {
           setColecao(match);
           // Normaliza URL para slug, removendo o hint `?id=` se houver.
           const desiredSlug = slugify(match.nome);
           if (desiredSlug && (slugOrId !== desiredSlug || hintId)) {
             const params = new URLSearchParams(searchParams);
             params.delete("id");
             const qs = params.toString();
             navigate(`/collections/${desiredSlug}${qs ? `?${qs}` : ""}`, { replace: true });
           }
         }
 
         // 2. Buscar produtos desta coleção
         const productsPage = await vitrineApiService.getProdutosPage({
           colecao: match.nome,
           limit: 50
         });
 
          if (active) {
            setProdutos(productsPage.items);
            setLoading(false);
          }
        } catch (err) {
          console.error("[CollectionDetail] Error fetching data:", err);
          if (active) {
            setError(true);
            setLoading(false);
          }
        }
      };
  
      fetchData();
  
      return () => {
        active = false;
      };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [slugOrId]);

    // Sincronizar filtros com URL
    useEffect(() => {
      const params = new URLSearchParams();
      if (categoriaSelecionada !== "todas") params.set("categoria", categoriaSelecionada);
      if (coresSelecionadas.length > 0) params.set("cores", coresSelecionadas.join(","));
      if (tamanhosSelecionados.length > 0) params.set("tamanhos", tamanhosSelecionados.join(","));
      if (precoAlterado) {
        params.set("min", faixaPreco[0].toString());
        params.set("max", faixaPreco[1].toString());
      }
      if (ordenarPor !== "padrao") params.set("sort", ordenarPor);
      if (paginaAtual > 1) params.set("page", paginaAtual.toString());

      const currentParams = searchParams.toString();
      const nextParams = params.toString();
      if (currentParams !== nextParams) {
        setSearchParams(params, { replace: true });
      }
    }, [categoriaSelecionada, coresSelecionadas, tamanhosSelecionados, faixaPreco, precoAlterado, ordenarPor, paginaAtual, setSearchParams]);

    // Carregar filtros da URL no mount
    useEffect(() => {
      const cat = searchParams.get("categoria");
      const cores = searchParams.get("cores");
      const tams = searchParams.get("tamanhos");
      const min = searchParams.get("min");
      const max = searchParams.get("max");
      const sort = searchParams.get("sort");
      const page = searchParams.get("page");

      if (cat) setCategoriaSelecionada(cat);
      if (cores) setCoresSelecionadas(cores.split(","));
      if (tams) setTamanhosSelecionados(tams.split(","));
      if (min && max) {
        setFaixaPreco([Number(min), Number(max)]);
        setPrecoAlterado(true);
      }
      if (sort) setOrdenarPor(sort);
      if (page) setPaginaAtual(Number(page));
    }, []); // Só no mount

    // Filtragem e Ordenação local (Premium Feel)
    const produtosFiltradosFull = useMemo(() => {
      let filtrados = [...produtos];

      // Filtro de categoria
      if (categoriaSelecionada !== "todas") {
        filtrados = filtrados.filter(p => p.categoria.toLowerCase() === categoriaSelecionada.toLowerCase());
      }

      // Filtro de preço
      if (precoAlterado) {
        filtrados = filtrados.filter(p => {
          const preco = p.emPromocao && p.precoPromocional ? p.precoPromocional : p.precoVenda;
          return preco >= faixaPreco[0] && (faixaPreco[1] === 0 || preco <= faixaPreco[1]);
        });
      }

      // Cores e Tamanhos
      if (coresSelecionadas.length > 0) {
        filtrados = filtrados.filter(p => p.cores?.some(c => coresSelecionadas.includes(c.cor)));
      }
      if (tamanhosSelecionados.length > 0) {
        filtrados = filtrados.filter(p => p.variants?.some(v => tamanhosSelecionados.includes(v.tamanho)));
      }

      // Ordenação
      if (ordenarPor === "preco-asc") {
        filtrados.sort((a, b) => (a.precoPromocional || a.precoVenda) - (b.precoPromocional || b.precoVenda));
      } else if (ordenarPor === "preco-desc") {
        filtrados.sort((a, b) => (b.precoPromocional || b.precoVenda) - (a.precoPromocional || a.precoVenda));
      }

      return filtrados;
    }, [produtos, categoriaSelecionada, ordenarPor, coresSelecionadas, tamanhosSelecionados, faixaPreco, precoAlterado]);

    // Paginação
    const produtosFiltrados = useMemo(() => {
      return produtosFiltradosFull.slice(0, paginaAtual * produtosPorPagina);
    }, [produtosFiltradosFull, paginaAtual]);

    const hasMore = produtosFiltrados.length < produtosFiltradosFull.length;

    const carregarMais = useCallback(() => {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
      setTimeout(() => {
        setPaginaAtual(prev => prev + 1);
        setLoadingMore(false);
      }, 600); // Shimmer feel
    }, [hasMore, loadingMore]);

    // Handler para aplicar filtros mobile (Delayed update)
    const applyMobileFilters = useCallback(() => {
      if (draftFilters.categoria !== undefined) setCategoriaSelecionada(draftFilters.categoria);
      if (draftFilters.cores !== undefined) setCoresSelecionadas(draftFilters.cores);
      if (draftFilters.tamanhos !== undefined) setTamanhosSelecionados(draftFilters.tamanhos);
      if (draftFilters.preco !== undefined) setFaixaPreco(draftFilters.preco);
      if (draftFilters.precoAlterado !== undefined) setPrecoAlterado(draftFilters.precoAlterado);
      
      setPaginaAtual(1);
      setDraftFilters({});
      // Close sheet logic is handled by the Button click usually if we wrap it, 
      // but here we rely on the component's internal state if we had it.
      // For now, we just update the actual states.
    }, [draftFilters]);

     const [config, setConfig] = useState<VitrineConfig | null>(null);
     useEffect(() => {
       vitrineApiService.getConfig().then(setConfig);
     }, []);
 
     const seoData = useMemo(() => {
       if (!colecao || !config) return null;
       const origin = typeof window !== "undefined" ? window.location.origin : "";
       const slug = slugify(colecao.nome) || colecao.id;
       const canonical = `${origin}/collections/${slug}`;
       return {
          title: `Coleção ${colecao.nome} | ${config.nomeLoja}`,
          description: (colecao.descricao || `Curadoria exclusiva da coleção ${colecao.nome}. Peças selecionadas para a mulher contemporânea na ${config.nomeLoja}.`).slice(0, 160),
         image: colecao.banner_url || colecao.imagem_capa_url || undefined,
          url: canonical,
          jsonLd: [
            {
              "@type": "BreadcrumbList",
              "itemListElement": [
                 { "@type": "ListItem", "position": 1, "name": "Início", "item": `${origin}/` },
                 { "@type": "ListItem", "position": 2, "name": "Coleções", "item": `${origin}/colecoes` },
                 { "@type": "ListItem", "position": 3, "name": colecao.nome, "item": canonical }
              ]
            },
            {
              "@type": "CollectionPage",
              "name": colecao.nome,
              "description": colecao.descricao,
               "url": canonical,
              "image": colecao.banner_url || colecao.imagem_capa_url
            },
            {
              "@type": "ItemList",
              "name": `Produtos da Coleção ${colecao.nome}`,
              "itemListElement": produtosFiltrados.slice(0, 12).map((p, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "url": `${window.location.origin}/product/${p.produtoId || p.id}`,
                "name": p.nome,
                "image": absoluteUrl(p.imagens[0])
              }))
            }
          ]
       };
     }, [colecao, config, produtosFiltrados]);

    // Dados para os filtros
    const coresDisponiveis = useMemo(() => {
      const cores = new Set<string>();
      produtos.forEach(p => p.cores?.forEach(c => cores.add(c.cor)));
      return Array.from(cores).sort();
    }, [produtos]);

    const tamanhosDisponiveis = useMemo(() => {
      const tamanhos = new Set<string>();
      produtos.forEach(p => p.variants?.forEach(v => tamanhos.add(v.tamanho)));
      return Array.from(tamanhos).sort();
    }, [produtos]);

    const precoMinMax = useMemo(() => {
      if (produtos.length === 0) return { min: 0, max: 0 };
      const precos = produtos.map(p => p.precoPromocional || p.precoVenda);
      return { min: Math.floor(Math.min(...precos)), max: Math.ceil(Math.max(...precos)) };
    }, [produtos]);

    useEffect(() => {
      if (precoMinMax.max > 0 && !precoAlterado) {
        setFaixaPreco([precoMinMax.min, precoMinMax.max]);
      }
    }, [precoMinMax, precoAlterado]);

    const handleLimparFiltros = () => {
      setCategoriaSelecionada("todas");
      setCoresSelecionadas([]);
      setTamanhosSelecionados([]);
      setFaixaPreco([precoMinMax.min, precoMinMax.max]);
      setPrecoAlterado(false);
      setOrdenarPor("padrao");
    };

    // Sheet de filtros (botão único "Filtros")
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Fade-key da grid: muda a cada alteração de filtro para um
    // crossfade suave (evita o "piscar" da grid ao re-filtrar).
    const gridFadeKey = useMemo(
      () =>
        `${categoriaSelecionada}|${coresSelecionadas.join(",")}|${tamanhosSelecionados.join(",")}|${ordenarPor}|${precoAlterado ? faixaPreco.join("-") : ""}`,
      [categoriaSelecionada, coresSelecionadas, tamanhosSelecionados, ordenarPor, faixaPreco, precoAlterado],
    );

    // Pré-carrega as imagens dos cards quando uma cor é selecionada,
    // para que a troca da foto (cor → imagem correspondente) não cause
    // flash/placeholder no grid.
    useEffect(() => {
      if (typeof window === "undefined") return;
      if (coresSelecionadas.length === 0) return;
      // Limite controlado para não impactar a performance:
      // top N produtos × dedupe por URL.
      const PRELOAD_LIMIT = 12;
      const urls = new Set<string>();
      for (const p of produtosFiltradosFull.slice(0, PRELOAD_LIMIT)) {
        for (const cor of coresSelecionadas) {
          const c = p.cores?.find((cc) => cc.cor === cor);
          const url = c?.imagem_card_url || c?.imagem_full || c?.imagem_thumb;
          if (url) urls.add(url);
        }
      }
      // Roda em idle para não competir com o render dos cards.
      const run = () => {
        urls.forEach((u) => {
          const img = new Image();
          img.decoding = "async";
          img.loading = "eager";
          img.src = u;
        });
      };
      const ric: ((cb: () => void) => number) | undefined =
        (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
      const handle = ric ? ric(run) : window.setTimeout(run, 50);
      return () => {
        const cic: ((h: number) => void) | undefined =
          (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
        if (ric && cic) cic(handle);
        else window.clearTimeout(handle);
      };
    }, [coresSelecionadas, produtosFiltradosFull]);

    // Quantidades por categoria (badges no Sheet) — calculada sobre o
    // recorte de produtos respeitando os demais filtros ativos, como
    // FiltersContent já faz para cores/tamanhos via produtosFiltradosParcial.
    const categoriasCount = useMemo(() => {
      const map: Record<string, number> = { todas: produtos.length };
      produtos.forEach((p) => {
        const cat = (p.categoria || "").toLowerCase();
        map[cat] = (map[cat] ?? 0) + 1;
      });
      return map;
    }, [produtos]);

    // Skeleton elegante durante a troca de filtros — evita "piscadas" em
    // conexões lentas mantendo a percepção de continuidade.
    const [isFiltering, setIsFiltering] = useState(false);
    useEffect(() => {
      if (loading) return;
      setIsFiltering(true);
      const t = window.setTimeout(() => setIsFiltering(false), 220);
      return () => window.clearTimeout(t);
    }, [gridFadeKey, loading]);

    const totalCategoriasNaColecao = useMemo(() => {
      const s = new Set<string>();
      produtos.forEach((p) => s.add(p.categoria.toLowerCase()));
      return s.size;
    }, [produtos]);

    const activeFiltersCount =
      (categoriaSelecionada !== "todas" ? 1 : 0) +
      coresSelecionadas.length +
      tamanhosSelecionados.length +
      (precoAlterado ? 1 : 0);

    if (error) {
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow flex items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-2xl font-serif mb-4 text-foreground">Coleção não encontrada</h2>
              <Button asChild variant="outline">
                <Link to="/">Voltar para a Home</Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

     return (
       <div className="min-h-screen flex flex-col bg-background">
         {seoData && (
           <SEOMeta 
             title={seoData.title}
             description={seoData.description}
             image={seoData.image}
             url={seoData.url}
             jsonLd={seoData.jsonLd}
           />
         )}
         <Header />
        
        <main className="flex-grow">
          {/* ============ HERO EDITORIAL ============ */}
          <section className="relative w-full overflow-hidden bg-muted">
            <div className="relative h-[80vh] min-h-[520px] max-h-[820px] w-full">
              {loading ? (
                <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
              ) : (colecao?.banner_url || colecao?.imagem_capa_url) ? (
                <img
                  src={colecao.banner_url || colecao.imagem_capa_url || ""}
                  alt={colecao?.nome || "Coleção"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageOff className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              {/* Gradient compositional — top-left vinheta + bottom panel para info */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/75 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/60 to-transparent" />
              {colecao?.cor_destaque && (
                <span
                  aria-hidden
                  style={{ backgroundColor: colecao.cor_destaque }}
                  className="absolute top-0 left-0 right-0 h-[3px]"
                />
              )}

              {/* Voltar */}
              <Link
                to="/colecoes"
                className="absolute top-6 left-6 sm:top-8 sm:left-8 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[11px] uppercase tracking-[0.2em] hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Coleções
              </Link>

              {/* Conteúdo do hero — alinhado bottom-left, magazine-style */}
              <div className="absolute inset-x-0 bottom-0 z-10">
                <PageContainer className="pb-10 sm:pb-14 lg:pb-16">
                  {!loading && colecao && (
                    <div className="max-w-4xl text-white animate-in fade-in slide-in-from-bottom-6 duration-1000">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[10px] uppercase tracking-[0.25em] mb-4 sm:mb-6">
                        <Sparkles className="w-3 h-3" /> Coleção em Destaque
                      </span>
                      <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-light leading-[0.95] tracking-tight">
                        {colecao.nome}
                      </h1>
                      {colecao.descricao && (
                        <p className="mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg lg:text-xl font-light text-white/90 leading-relaxed italic">
                          "{colecao.descricao}"
                        </p>
                      )}

                      {/* Barra de info útil — dá função ao banner */}
                      <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-white/90">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-serif text-2xl sm:text-3xl font-light leading-none">
                            {produtos.length}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                            Peças
                          </span>
                        </div>
                        <span className="w-px h-6 bg-white/30 hidden sm:block" />
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-serif text-2xl sm:text-3xl font-light leading-none">
                            {totalCategoriasNaColecao}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                            Categorias
                          </span>
                        </div>
                        {coresDisponiveis.length > 0 && (
                          <>
                            <span className="w-px h-6 bg-white/30 hidden sm:block" />
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                                Paleta
                              </span>
                              <div className="flex -space-x-1.5">
                                {coresDisponiveis.slice(0, 6).map((cor) => (
                                  <span
                                    key={cor}
                                    title={cor}
                                    style={{ backgroundColor: COLOR_SWATCH[cor] || "#D4C5B9" }}
                                    className="w-5 h-5 rounded-full ring-2 ring-white/80 shadow"
                                  />
                                ))}
                                {coresDisponiveis.length > 6 && (
                                  <span className="w-5 h-5 rounded-full ring-2 ring-white/80 bg-black/60 text-[9px] flex items-center justify-center font-medium">
                                    +{coresDisponiveis.length - 6}
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* CTA scroll para os produtos */}
                      <button
                        onClick={() => {
                          scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="mt-7 sm:mt-9 group inline-flex items-center gap-3 text-sm uppercase tracking-[0.25em] border-b border-white/70 pb-1 hover:border-white transition-colors"
                      >
                        Ver a coleção
                        <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                      </button>
                    </div>
                  )}
                </PageContainer>
              </div>
            </div>
          </section>

          {/* ============ CONTEÚDO ============ */}
          <div ref={scrollRef} />
          <PageContainer className="py-8 sm:py-12">
            <Breadcrumbs
              items={[{ label: "Coleções", path: "/colecoes" }]}
              currentPage={colecao?.nome || "Coleção"}
            />

            {/* Toolbar mínima — só Filtros + Ordenação + contagem */}
            <div className="mt-8 mb-10 flex items-center justify-between gap-4 pb-5 border-b border-border/70 sticky top-[var(--header-height)] z-20 bg-background/85 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-border/80 uppercase tracking-[0.2em] text-[11px] h-10 px-4 gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="font-serif text-2xl text-left">Refinar coleção</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 pb-24">
                      <FiltersContent
                        categoriaSelecionada={categoriaSelecionada}
                        setCategoriaSelecionada={(v) => { setCategoriaSelecionada(v); setPaginaAtual(1); }}
                        coresSelecionadas={coresSelecionadas}
                        setCoresSelecionadas={(v) => { setCoresSelecionadas(v); setPaginaAtual(1); }}
                        tamanhosSelecionados={tamanhosSelecionados}
                        setTamanhosSelecionados={(v) => { setTamanhosSelecionados(v); setPaginaAtual(1); }}
                        faixaPreco={faixaPreco}
                        setFaixaPreco={setFaixaPreco}
                        setPrecoAlterado={setPrecoAlterado}
                        precoAlterado={precoAlterado}
                        coresDisponiveis={coresDisponiveis}
                        tamanhosDisponiveis={tamanhosDisponiveis}
                        precoMin={precoMinMax.min}
                        precoMax={precoMinMax.max}
                        onLimparFiltros={handleLimparFiltros}
                        setPaginaAtual={setPaginaAtual}
                        activeFiltersCount={activeFiltersCount}
                        produtosFiltradosParcial={produtos}
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-background border-t flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={handleLimparFiltros}>
                        Limpar
                      </Button>
                      <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                        Ver {produtosFiltradosFull.length} peças
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleLimparFiltros}
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" /> Limpar
                  </button>
                )}

                <span className="hidden md:inline text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  {produtosFiltradosFull.length} {produtosFiltradosFull.length === 1 ? "peça" : "peças"}
                </span>
              </div>

              <Select value={ordenarPor} onValueChange={(v) => { setOrdenarPor(v); setPaginaAtual(1); }}>
                <SelectTrigger className="w-auto sm:w-[200px] bg-transparent border-none focus:ring-0 text-[11px] uppercase tracking-[0.2em] h-10">
                  <SelectValue placeholder="ORDENAR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">Lançamentos</SelectItem>
                  <SelectItem value="preco-asc">Menor preço</SelectItem>
                  <SelectItem value="preco-desc">Maior preço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chips de filtros ativos */}
            {activeFiltersCount > 0 && !loading && (
              <div className="mb-8 flex flex-wrap gap-2">
                {categoriaSelecionada !== "todas" && (
                  <Badge variant="secondary" className="rounded-full pl-3 pr-2 py-1 gap-1.5 capitalize">
                    {categoriaSelecionada}
                    <button onClick={() => setCategoriaSelecionada("todas")} aria-label="Remover categoria">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {coresSelecionadas.map((cor) => (
                  <Badge key={cor} variant="secondary" className="rounded-full pl-2 pr-2 py-1 gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-border/60"
                      style={{ backgroundColor: COLOR_SWATCH[cor] || "#D4C5B9" }}
                    />
                    {cor}
                    <button onClick={() => setCoresSelecionadas(coresSelecionadas.filter((c) => c !== cor))} aria-label={`Remover ${cor}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {tamanhosSelecionados.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full pl-3 pr-2 py-1 gap-1.5 uppercase">
                    {t}
                    <button onClick={() => setTamanhosSelecionados(tamanhosSelecionados.filter((x) => x !== t))} aria-label={`Remover ${t}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {precoAlterado && (
                  <Badge variant="secondary" className="rounded-full pl-3 pr-2 py-1 gap-1.5">
                    R$ {faixaPreco[0]} – {faixaPreco[1]}
                    <button onClick={() => { setPrecoAlterado(false); setFaixaPreco([precoMinMax.min, precoMinMax.max]); }} aria-label="Remover preço">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Grid editorial — destaque maior no primeiro card */}
            {loading ? (
              <ProductsLoadingSkeleton count={8} />
            ) : produtosFiltrados.length > 0 ? (
              <>
                <div
                  key={gridFadeKey}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-7 animate-in fade-in duration-500"
                >
                  {produtosFiltrados.map((produto, idx) => {
                    // Layout editorial: primeiro card ocupa 2x no desktop ("hero piece").
                    const isFeatured = idx === 0;
                    return (
                      <div
                        key={produto.id}
                        className={cn(
                          "group relative transition-all duration-500",
                          isFeatured && "col-span-2 lg:row-span-2",
                        )}
                      >
                        {isFeatured && (
                          <span className="absolute -top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] uppercase tracking-[0.2em] font-semibold shadow-md">
                            <Sparkles className="w-2.5 h-2.5" /> Destaque
                          </span>
                        )}
                        <div
                          className={cn(
                            "rounded-xl overflow-hidden bg-card transition-shadow duration-500",
                            isFeatured
                              ? "ring-1 ring-border/60 shadow-sm hover:shadow-xl"
                              : "hover:shadow-md",
                          )}
                        >
                          <ProductCard produto={produto} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="mt-16 sm:mt-20 text-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={carregarMais}
                      disabled={loadingMore}
                      className="min-w-[220px] uppercase tracking-[0.25em] text-[11px] rounded-full border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                        </span>
                      ) : (
                        "Carregar mais peças"
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-24 text-center">
                <p className="text-muted-foreground font-light italic text-lg">
                  Nenhuma peça encontrada com estes filtros.
                </p>
                <Button
                  variant="link"
                  onClick={handleLimparFiltros}
                  className="mt-4 uppercase tracking-[0.25em] text-[11px]"
                >
                  Limpar todos os filtros
                </Button>
              </div>
            )}
          </PageContainer>
        </main>

        <Footer />
      </div>
    );
  };

  export default CollectionDetail;