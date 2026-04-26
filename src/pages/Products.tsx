import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeleton, ProductsLoadingSkeleton } from "@/components/ProductSkeleton";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductSearch } from "@/components/ProductSearch";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, List, Tag, Sparkles, WifiOff, RefreshCw, ShoppingBag, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CATEGORIAS_DB } from "@/data/categories";
import { vitrineApiService, type FilterOption } from "@/services/vitrineApiService";
import type { Produto } from "@/data/products";
import { updateSeo } from "@/lib/seo";
import { selectNovidadesIds } from "@/lib/novidades";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type CatalogFilterOption = FilterOption & { apiValue?: string };

const defaultCategorias: CatalogFilterOption[] = CATEGORIAS_DB.map((categoria) => ({
  value: categoria.value,
  label: categoria.label,
  apiValue: categoria.label,
}));

const produtosPorPagina = 12;

function getBadgeValue(produto: Produto) {
  return produto.badgePublico || produto.publicBadge || produto.destaque_publico || produto.recomendacao_publica || null;
}

function dedupeOptions(options: CatalogFilterOption[]): CatalogFilterOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCategoriaOption(option: FilterOption): CatalogFilterOption | null {
  const normalized = option.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const match = CATEGORIAS_DB.find((categoria) => {
    const candidates = [categoria.value, categoria.label, categoria.dbValue ?? ""].map((value) =>
      value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );
    return candidates.includes(normalized);
  });

  return match ? { value: match.value, label: match.label, apiValue: match.label } : null;
}

function normalizeSearchValue(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function resolveCategoriaApiValue(categorias: CatalogFilterOption[], selected: string): string {
  const normalizedSelected = normalizeSearchValue(selected);
  const match = categorias.find((categoria) =>
    [categoria.value, categoria.label, categoria.apiValue || ""].some((value) => normalizeSearchValue(value) === normalizedSelected)
  );
  return match?.apiValue || match?.label || selected;
}

const Products = () => {
  const { produtos, loading, isFromCache, forceRefresh } = useProducts();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("todas");
  const [mostrarPromocao, setMostrarPromocao] = useState<boolean>(false);
  const [mostrarNovidades, setMostrarNovidades] = useState<boolean>(false);
  const [mostrarMaisProcurados, setMostrarMaisProcurados] = useState<boolean>(false);
  const [ordenarPor, setOrdenarPor] = useState<string>("padrao");
  const [colecaoSelecionada, setColecaoSelecionada] = useState<string>("todas");
  const [categoriasApi, setCategoriasApi] = useState<CatalogFilterOption[]>(defaultCategorias);
  const [colecoesApi, setColecoesApi] = useState<CatalogFilterOption[]>([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState<Produto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [coresSelecionadas, setCoresSelecionadas] = useState<string[]>([]);
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState<string[]>([]);
  const [visualizacao, setVisualizacao] = useState<"grade" | "lista">("grade");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Aplicar filtros da URL
  useEffect(() => {
    const filter = searchParams.get("filter");
    const categoria = searchParams.get("categoria");
    const colecao = searchParams.get("colecao");
    if (filter === "promocoes") {
      setMostrarPromocao(true);
      setMostrarNovidades(false);
      setMostrarMaisProcurados(false);
    } else if (filter === "novidades") {
      setMostrarNovidades(true);
      setMostrarPromocao(false);
      setMostrarMaisProcurados(false);
    } else if (filter === "mais_procurado") {
      setMostrarMaisProcurados(true);
      setMostrarPromocao(false);
      setMostrarNovidades(false);
    }
    if (categoria && categoria !== "todas") {
      setCategoriaSelecionada(categoria);
    }
    if (colecao && colecao !== "todas") {
      setColecaoSelecionada(colecao);
    }
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    categoriaSelecionada !== "todas" ? next.set("categoria", categoriaSelecionada) : next.delete("categoria");
    colecaoSelecionada !== "todas" ? next.set("colecao", colecaoSelecionada) : next.delete("colecao");
    mostrarPromocao ? next.set("filter", "promocoes") : mostrarNovidades ? next.set("filter", "novidades") : mostrarMaisProcurados ? next.set("filter", "mais_procurado") : next.delete("filter");

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [categoriaSelecionada, colecaoSelecionada, mostrarPromocao, mostrarNovidades, mostrarMaisProcurados, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([vitrineApiService.getCategorias(), vitrineApiService.getColecoes()]).then(([categoriasResult, colecoesResult]) => {
      if (!active) return;

      if (categoriasResult.status === "fulfilled") {
        const categoriasReais = categoriasResult.value.map(normalizeCategoriaOption).filter((categoria): categoria is CatalogFilterOption => Boolean(categoria));
        if (categoriasReais.length > 0) {
          setCategoriasApi(dedupeOptions([defaultCategorias[0], ...categoriasReais.filter((categoria) => categoria.value !== "todas")]));
        }
      }

      if (colecoesResult.status === "fulfilled") {
        setColecoesApi(dedupeOptions([{ value: "todas", label: "Todas" }, ...colecoesResult.value]));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const produtosBase = produtosCatalogo.length > 0 || !catalogLoading ? produtosCatalogo : produtos;

  useEffect(() => {
    vitrineApiService.getConfig().then((config) => {
      updateSeo({
        title: `Catálogo de Moda Feminina | ${config.nomeLoja}`,
        description: `Explore o catálogo completo da ${config.nomeLoja} com peças exclusivas e novas coleções em Campina Grande - PB.`,
        image: config.logoUrl || produtosBase[0]?.imagens[0],
        url: `${window.location.origin}/products`,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Início",
              item: window.location.origin,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Produtos",
              item: `${window.location.origin}/products`,
            },
          ],
        },
      });
    });
  }, [produtosBase]);

  // Calcular preço mínimo e máximo
  const { precoMin, precoMax } = useMemo(() => {
    if (produtosBase.length === 0) {
      return { precoMin: 0, precoMax: 0 };
    }
    const precos = produtosBase.map(p => p.emPromocao && p.precoPromocional ? p.precoPromocional : p.precoVenda);
    return {
      precoMin: Math.floor(Math.min(...precos)),
      precoMax: Math.ceil(Math.max(...precos))
    };
  }, [produtosBase]);

  const [faixaPreco, setFaixaPreco] = useState<[number, number]>([0, 0]);
  const [precoAlterado, setPrecoAlterado] = useState(false);
  const faixaPrecoSegura = useMemo<[number, number]>(() => {
    const min = Math.max(0, Number.isFinite(faixaPreco[0]) ? faixaPreco[0] : 0);
    const max = Math.max(0, Number.isFinite(faixaPreco[1]) ? faixaPreco[1] : min);
    return min <= max ? [min, max] : [max, min];
  }, [faixaPreco]);

  // Contador de filtros ativos
  const activeFiltersCount = 
    (categoriaSelecionada !== "todas" ? 1 : 0) +
    (colecaoSelecionada !== "todas" ? 1 : 0) +
    (mostrarPromocao ? 1 : 0) +
    (mostrarNovidades ? 1 : 0) +
    (mostrarMaisProcurados ? 1 : 0) +
    coresSelecionadas.length +
    tamanhosSelecionados.length +
    (precoAlterado && (faixaPrecoSegura[0] !== precoMin || faixaPrecoSegura[1] !== precoMax) ? 1 : 0);

  // Contagem de produtos por categoria - usando os valores corretos do banco
  const categoriasCount = useMemo(() => {
    const counts: Record<string, number> = {
      todas: produtosBase.length,
    };
    
    // Inicializar todas as categorias com 0
    CATEGORIAS_DB.forEach(cat => {
      if (cat.value !== "todas") {
        counts[cat.value] = 0;
      }
    });
    
    // Contar produtos por categoria
    produtosBase.forEach(p => {
      if (counts[p.categoria] !== undefined) {
        counts[p.categoria]++;
      }
    });
    
    return counts;
  }, [produtosBase]);

  // Atualizar faixa de preço quando produtos carregarem
  useEffect(() => {
    if (precoMin && precoMax && faixaPreco[0] === 0 && faixaPreco[1] === 0) {
      setFaixaPreco([precoMin, precoMax]);
    }
  }, [precoMin, precoMax]);

  const getProdutosQuery = useCallback((offset = 0) => {
    const categoriaApi = resolveCategoriaApiValue(categoriasApi, categoriaSelecionada);

    return {
      limit: produtosPorPagina,
      offset,
      busca: searchQuery.trim() || undefined,
      categoria: categoriaSelecionada !== "todas" ? categoriaApi : undefined,
      colecao: colecaoSelecionada !== "todas" ? colecaoSelecionada : undefined,
      ordem: ordenarPor !== "padrao" ? ordenarPor : undefined,
      preco_min: precoAlterado && faixaPrecoSegura[0] > 0 ? faixaPrecoSegura[0] : undefined,
      preco_max: precoAlterado && faixaPrecoSegura[1] > 0 ? faixaPrecoSegura[1] : undefined,
    };
  }, [categoriaSelecionada, categoriasApi, colecaoSelecionada, faixaPrecoSegura, ordenarPor, precoAlterado, searchQuery]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setProdutosCatalogo([]);
    setPaginaAtual(1);

    const query = getProdutosQuery(0);
    if (query.categoria) {
      console.info("[vitrine-api] filtro categoria", {
        selecionada: categoriaSelecionada,
        apiValue: query.categoria,
      });
    }

    vitrineApiService.getProdutosPage(query).then((page) => {
      if (!active) return;
      setProdutosCatalogo(page.items);
      setHasMore(page.hasMore);
      setTotalProdutos(page.total);
      setCatalogLoading(false);
    }).catch(() => {
      if (!active) return;
      setHasMore(false);
      setTotalProdutos(0);
      setCatalogLoading(false);
    });

    return () => {
      active = false;
    };
  }, [categoriaSelecionada, getProdutosQuery]);

  const handleCarregarMais = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const page = await vitrineApiService.getProdutosPage(getProdutosQuery(produtosCatalogo.length));
      setProdutosCatalogo((current) => {
        const ids = new Set(current.map((produto) => produto.id));
        const novos = page.items.filter((produto) => !ids.has(produto.id));
        return [...current, ...novos];
      });
      setHasMore(page.hasMore);
      setTotalProdutos(page.total);
    } catch {
      toast({
        title: "Erro ao carregar mais",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [getProdutosQuery, hasMore, loadingMore, produtosCatalogo.length, toast]);
  
  // Reset página quando filtros mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [categoriaSelecionada, colecaoSelecionada, mostrarPromocao, mostrarNovidades, mostrarMaisProcurados, coresSelecionadas, tamanhosSelecionados, ordenarPor, searchQuery]);

  // Handler para pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    const success = await forceRefresh();
    if (success) {
      toast({
        title: "Produtos atualizados!",
        description: "A lista foi atualizada com sucesso.",
      });
    } else {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar. Usando dados salvos.",
        variant: "destructive",
      });
    }
  }, [forceRefresh, toast]);

  // Filtrar produtos primeiro (sem cor e tamanho)
  const produtosFiltradosParcial = useMemo(() => {
    let filtrados = produtosBase;

    // Filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nome.toLowerCase().includes(query) ||
        p.categoria.toLowerCase().includes(query) ||
        p.variants.some(v => v.cor.toLowerCase().includes(query))
      );
    }
    
    // Filtro de promoção
    if (mostrarPromocao) {
      filtrados = filtrados.filter(p => p.emPromocao);
    }
    
    // Filtro de novidades: usa createdAt desc com fallback determinístico por id desc
    if (mostrarNovidades) {
      const ids = selectNovidadesIds(filtrados);
      filtrados = filtrados.filter((p) => ids.has(p.id));
    }

    if (mostrarMaisProcurados) {
      filtrados = filtrados.filter(p => getBadgeValue(p) === "mais_procurado");
    }

    // Filtro de preço - só aplicar se faixaPreco foi configurado e é diferente do padrão
    if (precoAlterado && (faixaPrecoSegura[0] > 0 || faixaPrecoSegura[1] > 0)) {
      if (faixaPrecoSegura[0] !== precoMin || faixaPrecoSegura[1] !== precoMax) {
        filtrados = filtrados.filter(p => {
          const preco = p.emPromocao && p.precoPromocional ? p.precoPromocional : p.precoVenda;
          return preco >= faixaPrecoSegura[0] && preco <= faixaPrecoSegura[1];
        });
      }
    }

    return filtrados;
  }, [produtosBase, mostrarPromocao, mostrarNovidades, mostrarMaisProcurados, precoAlterado, faixaPrecoSegura, precoMin, precoMax, searchQuery]);

  // Extrair cores disponíveis baseado nos filtros atuais (inteligente)
  const coresDisponiveis = useMemo(() => {
    const cores = new Set<string>();
    produtosFiltradosParcial.forEach(p => {
      p.variants.forEach(v => {
        // Se há tamanhos selecionados, só mostrar cores que têm esses tamanhos
        if (tamanhosSelecionados.length > 0) {
          if (tamanhosSelecionados.includes(v.tamanho)) {
            cores.add(v.cor);
          }
        } else {
          cores.add(v.cor);
        }
      });
    });
    return Array.from(cores).sort();
  }, [produtosFiltradosParcial, tamanhosSelecionados]);

  // Extrair tamanhos disponíveis baseado nos filtros atuais (inteligente)
  const tamanhosDisponiveis = useMemo(() => {
    const tamanhos = new Set<string>();
    produtosFiltradosParcial.forEach(p => {
      p.variants.forEach(v => {
        // Se há cores selecionadas, só mostrar tamanhos que têm essas cores
        if (coresSelecionadas.length > 0) {
          if (coresSelecionadas.includes(v.cor)) {
            tamanhos.add(v.tamanho);
          }
        } else {
          tamanhos.add(v.tamanho);
        }
      });
    });
    return Array.from(tamanhos).sort();
  }, [produtosFiltradosParcial, coresSelecionadas]);

  // Aplicar filtros de cor e tamanho
  let produtosFiltrados = produtosFiltradosParcial;

  // Filtro de cor
  if (coresSelecionadas.length > 0) {
    produtosFiltrados = produtosFiltrados.filter(p => {
      return p.variants.some(v => coresSelecionadas.includes(v.cor));
    });
  }

  // Filtro de tamanho
  if (tamanhosSelecionados.length > 0) {
    produtosFiltrados = produtosFiltrados.filter(p => {
      return p.variants.some(v => tamanhosSelecionados.includes(v.tamanho));
    });
  }

  // Ordenar produtos
  const produtosOrdenados = [...produtosFiltrados].sort((a, b) => {
    const precoA = a.emPromocao && a.precoPromocional ? a.precoPromocional : a.precoVenda;
    const precoB = b.emPromocao && b.precoPromocional ? b.precoPromocional : b.precoVenda;
    if (ordenarPor === "preco-asc") return precoA - precoB;
    if (ordenarPor === "preco-desc") return precoB - precoA;
    return 0;
  });

  const handleLimparFiltros = () => {
    setCategoriaSelecionada("todas");
    setColecaoSelecionada("todas");
    setMostrarPromocao(false);
    setMostrarNovidades(false);
    setMostrarMaisProcurados(false);
    setCoresSelecionadas([]);
    setTamanhosSelecionados([]);
    setFaixaPreco([precoMin, precoMax]);
    setPrecoAlterado(false);
    setPaginaAtual(1);
  };

  return (
    <PullToRefresh onRefresh={handlePullRefresh} disabled={loading}>
      <div className="min-h-screen pt-[60px] sm:pt-[68px]">
        <Header />
        <main className="bg-background">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-12">
            <Breadcrumbs currentPage="Todos os Produtos" />
            
            {/* Silent background refresh when data is stale - no visible indicator */}
            
            {/* Cabeçalho */}
            <div className="text-center mb-6 sm:mb-8 md:mb-12 animate-fade-in">
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 text-foreground">
                Todos os Produtos
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-4 sm:mb-6">
                Confira nossa coleção completa
              </p>
            
            {/* Busca com autocomplete */}
            <div className="flex justify-center px-2 sm:px-0">
              <ProductSearch
                produtos={produtosBase}
                onSearch={setSearchQuery}
                searchQuery={searchQuery}
              />
            </div>
          </div>

          {/* Category Icons */}
          <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-2 scrollbar-hide justify-start sm:justify-center mb-6 sm:mb-8 px-2">
            {/* Ver Todos - destacado */}
            <button
              onClick={() => {
                setCategoriaSelecionada("todas");
                setPaginaAtual(1);
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 min-w-[56px] sm:min-w-[72px] group transition-all",
                categoriaSelecionada === "todas" && "scale-105"
              )}
            >
              <div className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 border",
                categoriaSelecionada === "todas"
                  ? "bg-primary border-primary shadow-lg text-primary-foreground"
                  : "bg-primary/10 border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:shadow-lg"
              )}>
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className={cn(
                "text-[10px] sm:text-xs transition-colors font-medium whitespace-nowrap",
                categoriaSelecionada === "todas" ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-primary"
              )}>
                Ver Todos
              </span>
            </button>

            {categoriasApi.filter(c => c.value !== "todas" && c.value !== "outros").map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setCategoriaSelecionada(categoriaSelecionada === cat.value ? "todas" : cat.value);
                  setPaginaAtual(1);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 min-w-[56px] sm:min-w-[72px] group transition-all",
                  categoriaSelecionada === cat.value && "scale-105"
                )}
              >
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-2xl transition-all duration-300 border",
                  categoriaSelecionada === cat.value
                    ? "bg-primary/15 border-primary shadow-md"
                    : "bg-secondary border-border group-hover:bg-primary/10 group-hover:scale-110 group-hover:border-primary/30"
                )}>
                  {categoryEmojis[cat.value] || "🛍️"}
                </div>
                <span className={cn(
                  "text-[10px] sm:text-xs transition-colors font-medium whitespace-nowrap",
                  categoriaSelecionada === cat.value ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>



          {/* Área de Produtos */}
          <div>
              {/* Barra de Controles */}
              <div className="flex flex-wrap gap-2 sm:gap-4 justify-between items-center mb-4 sm:mb-6">
                {/* Botão Filtros - Esquerda */}
                <div className="order-1">
                  <ProductFilters
                    categoriaSelecionada={categoriaSelecionada}
                    setCategoriaSelecionada={setCategoriaSelecionada}
                    colecaoSelecionada={colecaoSelecionada}
                    setColecaoSelecionada={setColecaoSelecionada}
                    coresSelecionadas={coresSelecionadas}
                    setCoresSelecionadas={setCoresSelecionadas}
                    tamanhosSelecionados={tamanhosSelecionados}
                    setTamanhosSelecionados={setTamanhosSelecionados}
                    faixaPreco={faixaPreco}
                    setFaixaPreco={setFaixaPreco}
                    setPrecoAlterado={setPrecoAlterado}
                    coresDisponiveis={coresDisponiveis}
                    tamanhosDisponiveis={tamanhosDisponiveis}
                    precoMin={precoMin}
                    precoMax={precoMax}
                    categoriasDisponiveis={categoriasApi}
                    colecoesDisponiveis={colecoesApi}
                    categoriasCount={categoriasCount}
                    produtos={produtosBase}
                    produtosFiltradosParcial={produtosFiltradosParcial}
                    onLimparFiltros={handleLimparFiltros}
                    setPaginaAtual={setPaginaAtual}
                    activeFiltersCount={activeFiltersCount}
                    precoAlterado={precoAlterado}
                  />
                </div>

                {/* Botões Promoção e Novidades */}
                <div className="flex gap-1.5 sm:gap-2 order-3 sm:order-2">
                  <Button
                    variant={mostrarPromocao ? "default" : "outline"}
                    onClick={() => {
                      setMostrarPromocao(!mostrarPromocao);
                      setMostrarNovidades(false);
                      setMostrarMaisProcurados(false);
                      setPaginaAtual(1);
                    }}
                    size="sm"
                    className={cn(
                      "gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm",
                      mostrarPromocao && "shadow-md"
                    )}
                  >
                    <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Promoção
                    <Badge variant={mostrarPromocao ? "secondary" : "outline"} className="ml-0.5 h-4 px-1 text-[9px] sm:text-[10px]">
                      {produtosBase.filter(p => p.emPromocao).length}
                    </Badge>
                  </Button>
                  <Button
                    variant={mostrarNovidades ? "default" : "outline"}
                    onClick={() => {
                      setMostrarNovidades(!mostrarNovidades);
                      setMostrarPromocao(false);
                      setMostrarMaisProcurados(false);
                      setPaginaAtual(1);
                    }}
                    size="sm"
                    className={cn(
                      "gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm",
                      mostrarNovidades && "shadow-md"
                    )}
                  >
                    <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Novidades
                    <Badge variant={mostrarNovidades ? "secondary" : "outline"} className="ml-0.5 h-4 px-1 text-[9px] sm:text-[10px]">
                      {selectNovidadesIds(produtosBase).size}
                    </Badge>
                  </Button>
                  <Button
                    variant={mostrarMaisProcurados ? "default" : "outline"}
                    onClick={() => {
                      setMostrarMaisProcurados(!mostrarMaisProcurados);
                      setMostrarPromocao(false);
                      setMostrarNovidades(false);
                      setPaginaAtual(1);
                    }}
                    size="sm"
                    className={cn(
                      "gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm",
                      mostrarMaisProcurados && "shadow-md"
                    )}
                  >
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Mais procurados
                    <Badge variant={mostrarMaisProcurados ? "secondary" : "outline"} className="ml-0.5 h-4 px-1 text-[9px] sm:text-[10px]">
                      {produtosBase.filter(p => getBadgeValue(p) === "mais_procurado").length}
                    </Badge>
                  </Button>
                </div>

                {/* Ordenação e Visualização - Direita */}
                <div className="flex gap-1.5 sm:gap-2 order-2 sm:order-3">
                  <Select value={ordenarPor} onValueChange={setOrdenarPor}>
                    <SelectTrigger className="w-[120px] sm:w-[180px] h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Padrão</SelectItem>
                      <SelectItem value="preco-asc">Menor Preço</SelectItem>
                      <SelectItem value="preco-desc">Maior Preço</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Toggle de visualização - escondido em mobile muito pequeno */}
                  <div className="hidden xs:flex border border-border rounded-lg overflow-hidden">
                    <Button
                      variant={visualizacao === "grade" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setVisualizacao("grade")}
                      className="rounded-none h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <Grid3x3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant={visualizacao === "lista" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setVisualizacao("lista")}
                      className="rounded-none h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Grid/Lista de Produtos */}
              {catalogLoading ? (
                <div className={`${
                  visualizacao === "grade"
                    ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
                    : "space-y-3 sm:space-y-4"
                }`}>
                  {Array.from({ length: produtosPorPagina }).map((_, index) => (
                    <ProductSkeleton 
                      key={index} 
                      layoutMode={visualizacao}
                    />
                  ))}
                </div>
              ) : produtosOrdenados.length > 0 ? (
                <>
                  <div className={`${
                    visualizacao === "grade"
                      ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
                      : "space-y-3 sm:space-y-4"
                  }`}>
                    {produtosOrdenados.map((produto, index) => (
                        <div 
                          key={produto.id} 
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <ProductCard 
                            produto={produto}
                            layoutMode={visualizacao}
                          />
                        </div>
                      ))}
                  </div>

                  {/* Contador */}
                  <div className="text-center mt-8">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {totalProdutos || produtosOrdenados.length} produtos encontrados
                    </span>
                  </div>

                  {hasMore && (
                    <div className="flex items-center justify-center mt-4 animate-fade-in">
                      <Button
                        variant="outline"
                        onClick={handleCarregarMais}
                        disabled={loadingMore}
                        className="transition-all hover:scale-105"
                      >
                        {loadingMore ? "Carregando..." : "Carregar mais"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Nenhum produto encontrado com os filtros selecionados.
                  </p>
                </div>
              )}
            </div>
        </div>
      </main>
      <Footer />
    </div>
    </PullToRefresh>
  );
};

export default Products;
