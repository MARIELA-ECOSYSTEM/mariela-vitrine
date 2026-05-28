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
  import { 
    vitrineApiService, 
     type ColecaoDestaque,
     type FilterOption,
     type VitrineConfig
  } from "@/services/vitrineApiService";
  import type { Produto } from "@/data/products";
  import { absoluteUrl } from "@/lib/seo";
  import { SEOMeta } from "@/components/seo/SEOMeta";
  import { ArrowLeft, Sparkles, ImageOff, Filter, Grid3x3, List, ShoppingBag } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
  import { CATEGORIAS_DB } from "@/data/categories";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";

  const categoryEmojis: Record<string, string> = {
    "vestidos": "👗",
    "blusas": "👚",
    "calças": "👖",
    "saias": "🩱",
    "shorts": "🩳",
    "short-saias": "✨",
    "conjuntos": "💎",
    "bolsas": "👜",
    "acessorios": "💍",
  };

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
          {/* Hero Section Premium */}
          <section className="relative w-full h-[60vh] min-h-[400px] overflow-hidden bg-muted">
            {loading ? (
              <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
            ) : (colecao?.banner_url || colecao?.imagem_capa_url) ? (
              <>
                <img 
                  src={colecao.banner_url || colecao.imagem_capa_url || ""} 
                  alt={colecao.nome}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageOff className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
              <Link 
                to="/" 
                className="absolute top-8 left-8 flex items-center gap-2 text-sm uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Link>

              {!loading && (
                <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] uppercase tracking-[0.2em] mb-6">
                    <Sparkles className="w-3 h-3" /> Coleção Exclusiva
                  </span>
                  <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-light mb-6 tracking-tight">
                    {colecao?.nome}
                  </h1>
                  {colecao?.descricao && (
                    <p className="text-lg sm:text-xl font-light text-white/90 max-w-2xl mx-auto leading-relaxed italic">
                      "{colecao.descricao}"
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
              <div className="w-[1px] h-12 bg-white" />
            </div>
          </section>

          <PageContainer className="py-8 sm:py-12">
            <Breadcrumbs
              items={[{ label: "Coleções", path: "/colecoes" }]}
              currentPage={colecao?.nome || "Coleção"}
            />

            {/* Category Icons Navigation */}
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-hide justify-start sm:justify-center mt-8 mb-12">
              <button
                onClick={() => setCategoriaSelecionada("todas")}
                className={cn(
                  "flex flex-col items-center gap-2 min-w-[64px] transition-all",
                  categoriaSelecionada === "todas" ? "scale-105" : "opacity-60 hover:opacity-100"
                )}
              >
                <div className={cn(
                  "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all border",
                  categoriaSelecionada === "todas" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent"
                )}>
                  <ShoppingBag className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-tighter">Todos</span>
              </button>

              {CATEGORIAS_DB.filter(c => c.value !== "todas" && c.value !== "outros").map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoriaSelecionada(cat.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 min-w-[64px] transition-all",
                    categoriaSelecionada === cat.value ? "scale-105" : "opacity-60 hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all border text-xl sm:text-2xl",
                    categoriaSelecionada === cat.value ? "bg-primary border-primary" : "bg-muted border-transparent"
                  )}>
                    {categoryEmojis[cat.value] || "✨"}
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-tighter">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar Filters - Desktop */}
              <aside className="hidden lg:block w-64 space-y-8 shrink-0">
                <div className="sticky top-24">
                  <h3 className="font-serif text-xl mb-6 border-b pb-2">Filtros</h3>
                    <ProductFilters 
                      categoriaSelecionada={categoriaSelecionada}
                      setCategoriaSelecionada={setCategoriaSelecionada}
                      coresSelecionadas={coresSelecionadas}
                      setCoresSelecionadas={setCoresSelecionadas}
                      tamanhosSelecionados={tamanhosSelecionados}
                      setTamanhosSelecionados={setTamanhosSelecionados}
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
                      activeFiltersCount={(categoriaSelecionada !== "todas" ? 1 : 0) + coresSelecionadas.length + tamanhosSelecionados.length + (precoAlterado ? 1 : 0)}
                      produtosFiltradosParcial={produtos}
                    />
                </div>
              </aside>

              <div className="flex-grow">
                {/* Controls Bar */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground uppercase tracking-widest hidden sm:inline">
                      {produtosFiltrados.length} Peças Encontradas
                    </span>
                    {/* Mobile Filter Trigger */}
                    <div className="lg:hidden">
                      <ProductFilters 
                        categoriaSelecionada={draftFilters.categoria ?? categoriaSelecionada}
                        setCategoriaSelecionada={(val) => setDraftFilters(prev => ({ ...prev, categoria: val }))}
                        coresSelecionadas={draftFilters.cores ?? coresSelecionadas}
                        setCoresSelecionadas={(val) => setDraftFilters(prev => ({ ...prev, cores: val }))}
                        tamanhosSelecionados={draftFilters.tamanhos ?? tamanhosSelecionados}
                        setTamanhosSelecionados={(val) => setDraftFilters(prev => ({ ...prev, tamanhos: val }))}
                        faixaPreco={draftFilters.preco ?? faixaPreco}
                        setFaixaPreco={(val) => setDraftFilters(prev => ({ ...prev, preco: val }))}
                        setPrecoAlterado={(val) => setDraftFilters(prev => ({ ...prev, precoAlterado: val }))}
                        precoAlterado={draftFilters.precoAlterado ?? precoAlterado}
                        coresDisponiveis={coresDisponiveis}
                        tamanhosDisponiveis={tamanhosDisponiveis}
                        precoMin={precoMinMax.min}
                        precoMax={precoMinMax.max}
                        onLimparFiltros={() => {
                          setDraftFilters({
                            categoria: "todas",
                            cores: [],
                            tamanhos: [],
                            preco: [precoMinMax.min, precoMinMax.max],
                            precoAlterado: false
                          });
                        }}
                        setPaginaAtual={setPaginaAtual}
                        activeFiltersCount={(categoriaSelecionada !== "todas" ? 1 : 0) + coresSelecionadas.length + tamanhosSelecionados.length + (precoAlterado ? 1 : 0)}
                        produtosFiltradosParcial={produtos}
                        onApplyFilters={applyMobileFilters}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Select value={ordenarPor} onValueChange={setOrdenarPor}>
                      <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 text-xs uppercase tracking-widest">
                        <SelectValue placeholder="ORDENAR POR" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="padrao">LANÇAMENTOS</SelectItem>
                        <SelectItem value="preco-asc">MENOR PREÇO</SelectItem>
                        <SelectItem value="preco-desc">MAIOR PREÇO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loading ? (
                  <ProductsLoadingSkeleton count={6} />
                ) : produtosFiltrados.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12">
                      {produtosFiltrados.map((produto) => (
                        <ProductCard key={produto.id} produto={produto} />
                      ))}
                    </div>
                    
                    {hasMore && (
                      <div className="mt-16 text-center">
                        <Button 
                          variant="outline" 
                          size="lg" 
                          onClick={carregarMais}
                          disabled={loadingMore}
                          className="min-w-[200px] uppercase tracking-widest text-xs border-primary/20 hover:bg-primary/5"
                        >
                          {loadingMore ? (
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                            </span>
                          ) : "Carregar Mais Peças"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-24 text-center">
                    <p className="text-muted-foreground font-light italic text-lg">
                      Nenhum produto encontrado com estes filtros.
                    </p>
                    <Button 
                      variant="link" 
                      onClick={handleLimparFiltros}
                      className="mt-4 uppercase tracking-widest text-xs"
                    >
                      Limpar todos os filtros
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </PageContainer>
        </main>

        <Footer />
      </div>
    );
  };

  export default CollectionDetail;