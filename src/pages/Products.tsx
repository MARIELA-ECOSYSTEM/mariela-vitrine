import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageContainer } from "@/components/PageContainer";
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
 import { vitrineApiService, type FilterOption, type VitrineConfig } from "@/services/vitrineApiService";
import type { Produto } from "@/data/products";
 import { absoluteUrl } from "@/lib/seo";
 import { SEOMeta } from "@/components/seo/SEOMeta";
import { selectNovidadesIds } from "@/lib/novidades";
import { ProductsPagination, DEFAULT_PAGE_SIZE } from "@/components/ProductsPagination";
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
  // A API espera o nome canônico singular do banco (ex.: "Blusa"),
  // não o label plural exibido na UI (ex.: "Blusas").
  apiValue: categoria.dbValue ?? categoria.label,
}));

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

  // Mantemos o label PT-BR plural na UI, mas enviamos o nome canônico
  // do banco para a API (singular). Quando vier uma categoria
  // desconhecida, preservamos o label original como apiValue.
  if (match) {
    return { value: match.value, label: match.label, apiValue: match.dbValue ?? match.label };
  }
  return { value: option.value, label: option.label, apiValue: option.label };
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
  const { produtos, loading, isFromCache, forceRefresh, error: productsError } = useProducts();
  const { toast } = useToast();
  const isDebugIntegracao = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("debugIntegracao") === "1";
  }, []);

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
  // Loading "suave" para troca de página: mantém a grid anterior visível
  // com um fade/overlay enquanto o refetch acontece (evita tela vazia).
  const [pageTransitioning, setPageTransitioning] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [coresSelecionadas, setCoresSelecionadas] = useState<string[]>([]);
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState<string[]>([]);
  const [visualizacao, setVisualizacao] = useState<"grade" | "lista">("grade");
  const [paginaAtual, setPaginaAtual] = useState<number>(() => {
    const p = Number(searchParams.get("page"));
    return p > 0 ? p : 1;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [itensPorPagina, setItensPorPagina] = useState<number>(() => {
    const pp = Number(searchParams.get("perPage"));
    return pp > 0 ? pp : DEFAULT_PAGE_SIZE;
  });

  // Aplicar filtros da URL
  useEffect(() => {
    const filter = searchParams.get("filter");
    const categoria = searchParams.get("categoria");
    const colecao = searchParams.get("colecao");
    const colecaoId = searchParams.get("colecaoId");
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

  /**
   * Resolve `?colecaoId={id}` em nome canônico da coleção.
   *
   * Por que: o filtro do catálogo (e da API `/produtos?colecao=...`) opera
   * por NOME. Aceitar `id` no link permite navegação estável (imune a
   * renomeação/acentuação) sem precisar reescrever toda a lógica de
   * filtro. Resolvemos via `/colecoes?detalhes=1&destaque=1` (mesmo cache
   * já em memória, custo ~0) e populamos `colecaoSelecionada` com o nome
   * canônico vindo da API.
   *
   * Se a coleção não for encontrada (id inválido / fora de destaque /
   * inativa), removemos o param da URL silenciosamente para não deixar a
   * página em estado inconsistente.
   */
  useEffect(() => {
    const colecaoId = searchParams.get("colecaoId");
    if (!colecaoId) return;

    let cancelled = false;
    vitrineApiService
      .getColecoesDestaque()
      .then((colecoes) => {
        if (cancelled) return;
        const match = colecoes.find((c) => c.id === colecaoId);
        const next = new URLSearchParams(searchParams);
        next.delete("colecaoId");
        if (match) {
          setColecaoSelecionada(match.nome);
          next.set("colecao", match.nome);
        }
        setSearchParams(next, { replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        // API fora do ar: limpa o param para não travar o usuário num
        // filtro fantasma. Sem toast, sem log — falha silenciosa.
        const next = new URLSearchParams(searchParams);
        next.delete("colecaoId");
        setSearchParams(next, { replace: true });
      });

    return () => {
      cancelled = true;
    };
    // Roda quando o id muda; setSearchParams é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("colecaoId")]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    categoriaSelecionada !== "todas" ? next.set("categoria", categoriaSelecionada) : next.delete("categoria");
    colecaoSelecionada !== "todas" ? next.set("colecao", colecaoSelecionada) : next.delete("colecao");
    mostrarPromocao ? next.set("filter", "promocoes") : mostrarNovidades ? next.set("filter", "novidades") : mostrarMaisProcurados ? next.set("filter", "mais_procurado") : next.delete("filter");
    paginaAtual > 1 ? next.set("page", String(paginaAtual)) : next.delete("page");
    itensPorPagina !== DEFAULT_PAGE_SIZE ? next.set("perPage", String(itensPorPagina)) : next.delete("perPage");

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [categoriaSelecionada, colecaoSelecionada, mostrarPromocao, mostrarNovidades, mostrarMaisProcurados, paginaAtual, itensPorPagina, searchParams, setSearchParams]);

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

   const [config, setConfig] = useState<VitrineConfig | null>(null);
   useEffect(() => {
     vitrineApiService.getConfig().then(setConfig);
   }, []);

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
      limit: itensPorPagina,
      offset,
      busca: searchQuery.trim() || undefined,
      categoria: categoriaSelecionada !== "todas" ? categoriaApi : undefined,
      colecao: colecaoSelecionada !== "todas" ? colecaoSelecionada : undefined,
      ordem: ordenarPor !== "padrao" ? ordenarPor : undefined,
      preco_min: precoAlterado && faixaPrecoSegura[0] > 0 ? faixaPrecoSegura[0] : undefined,
      preco_max: precoAlterado && faixaPrecoSegura[1] > 0 ? faixaPrecoSegura[1] : undefined,
    };
  }, [categoriaSelecionada, categoriasApi, colecaoSelecionada, faixaPrecoSegura, ordenarPor, precoAlterado, searchQuery, itensPorPagina]);

  useEffect(() => {
    let active = true;
    // Primeira carga (sem produtos) usa o skeleton cheio.
    // Trocas de página usam fade/overlay mantendo a grid anterior visível.
    const isFirstLoad = produtosCatalogo.length === 0;
    if (isFirstLoad) setCatalogLoading(true);
    else setPageTransitioning(true);

    const offset = (paginaAtual - 1) * itensPorPagina;
    const query = getProdutosQuery(offset);
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
      setPageTransitioning(false);
    }).catch(() => {
      if (!active) return;
      setHasMore(false);
      setTotalProdutos(0);
      setCatalogLoading(false);
      setPageTransitioning(false);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaSelecionada, getProdutosQuery, paginaAtual, itensPorPagina]);

  // Reset página quando filtros mudarem — preservando itensPorPagina.
  useEffect(() => {
    setPaginaAtual(1);
  }, [categoriaSelecionada, colecaoSelecionada, mostrarPromocao, mostrarNovidades, mostrarMaisProcurados, coresSelecionadas, tamanhosSelecionados, ordenarPor, searchQuery]);

  // Prefetch das páginas adjacentes (anterior e próxima) — a resposta fica
  // no cache de `vitrineApiService`, tornando a navegação instantânea.
  useEffect(() => {
    if (catalogLoading || totalProdutos === 0) return;
    const totalPaginas = Math.max(1, Math.ceil(totalProdutos / itensPorPagina));
    const adjacentes: number[] = [];
    if (paginaAtual > 1) adjacentes.push(paginaAtual - 1);
    if (paginaAtual < totalPaginas) adjacentes.push(paginaAtual + 1);
    if (adjacentes.length === 0) return;
    const handle = window.setTimeout(() => {
      adjacentes.forEach((p) => {
        const offset = (p - 1) * itensPorPagina;
        vitrineApiService.getProdutosPage(getProdutosQuery(offset)).catch(() => {});
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [paginaAtual, itensPorPagina, totalProdutos, catalogLoading, getProdutosQuery]);

  // Scroll suave ao topo da grid quando o usuário navega entre páginas.
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paginaAtual > 1) {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [paginaAtual]);

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
   const produtosOrdenados = useMemo(() => {
     return [...produtosFiltrados].sort((a, b) => {
       const precoA = a.emPromocao && a.precoPromocional ? a.precoPromocional : a.precoVenda;
       const precoB = b.emPromocao && b.precoPromocional ? b.precoPromocional : b.precoVenda;
       if (ordenarPor === "preco-asc") return precoA - precoB;
       if (ordenarPor === "preco-desc") return precoB - precoA;
       return 0;
     });
   }, [produtosFiltrados, ordenarPor]);
 
    const seoData = useMemo(() => {
      if (!config) return null;
      
      let title = `Catálogo de Moda Feminina | ${config.nomeLoja}`;
      let description = `Explore o catálogo completo da ${config.nomeLoja} com peças exclusivas e novas coleções em Campina Grande - PB.`;
      
      if (categoriaSelecionada !== "todas") {
        const catObj = categoriasApi.find(c => c.value === categoriaSelecionada);
        if (catObj) {
          title = `${catObj.label} em Campina Grande | ${config.nomeLoja}`;
          description = `Confira nossa coleção de ${catObj.label.toLowerCase()} na ${config.nomeLoja}. Peças selecionadas com elegância, estilo e qualidade.`;
        }
      } else if (colecaoSelecionada !== "todas") {
        title = `Coleção ${colecaoSelecionada} | ${config.nomeLoja}`;
        description = `Descubra as novidades da coleção ${colecaoSelecionada} na ${config.nomeLoja}. Curadoria exclusiva de moda feminina com sofisticação.`;
      } else if (mostrarPromocao) {
        title = `Promoções de Moda Feminina | ${config.nomeLoja}`;
        description = `Ofertas imperdíveis em vestidos, conjuntos e blusas na ${config.nomeLoja}. Garanta suas peças favoritas com descontos exclusivos.`;
      } else if (mostrarNovidades) {
        title = `Novidades em Moda Feminina | ${config.nomeLoja}`;
        description = `Acompanhe os últimos lançamentos da ${config.nomeLoja}. As tendências mais recentes da moda feminina em Campina Grande.`;
      }
 
     return {
       title,
       description,
       image: config.logoUrl || produtosBase[0]?.imagens[0],
       url: `${window.location.origin}/products`,
       jsonLd: [
         {
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
         {
           "@type": "ItemList",
           "name": title,
           "description": description,
           "itemListElement": produtosOrdenados.slice(0, 12).map((p, i) => ({
             "@type": "ListItem",
             "position": i + 1,
             "url": `${window.location.origin}/product/${p.produtoId || p.id}`,
             "name": p.nome,
             "image": absoluteUrl(p.imagens[0])
           }))
         }
       ]
     };
   }, [config, categoriaSelecionada, colecaoSelecionada, mostrarPromocao, categoriasApi, produtosBase, produtosOrdenados]);

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

      {isDebugIntegracao && (
        <div className="bg-black text-green-400 p-4 font-mono text-xs overflow-auto max-h-60 border-b border-green-900/30 sticky top-16 z-50">
          <h3 className="font-bold border-b border-green-900/50 mb-2 pb-1 flex justify-between">
            <span>DIAGNÓSTICO DE INTEGRAÇÃO (PRODUTOS)</span>
            <span className="text-[10px] opacity-50 cursor-pointer" onClick={() => window.location.reload()}>RECARREGAR</span>
          </h3>
          <div className="space-y-1">
            <p>Status: {catalogLoading ? 'carregando...' : (produtosCatalogo.length > 0 ? 'OK' : 'Vazio ou Erro')}</p>
            <p>Total API: {totalProdutos}</p>
            <p>Total exibido: {produtosCatalogo.length}</p>
            {productsError && <p className="text-red-400">Erro: {productsError}</p>}
            <details className="mt-2">
              <summary className="cursor-pointer hover:underline text-[10px]">Ver query params</summary>
              <pre className="mt-1 p-2 bg-black/50 rounded">{JSON.stringify(getProdutosQuery(0), null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
        <main className="bg-background">
          <PageContainer>
            <Breadcrumbs currentPage="Todos os Produtos" />
            
            {/* Silent background refresh when data is stale - no visible indicator */}
            
            {/* Cabeçalho */}
            <div className="text-center mb-6 sm:mb-8 md:mb-12 animate-fade-in">
              {categoriaSelecionada === "todas" ? (
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 text-foreground">
                  Todos os Produtos
                </h1>
              ) : (
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 text-foreground">
                  {categoriasApi.find(c => c.value === categoriaSelecionada)?.label || "Produtos"}
                </h1>
              )}
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
                    variant={mostrarPromocao ? "destructive" : "outline"}
                    onClick={() => {
                      setMostrarPromocao(!mostrarPromocao);
                      setMostrarNovidades(false);
                      setMostrarMaisProcurados(false);
                      setPaginaAtual(1);
                    }}
                    size="sm"
                    className={cn(
                      "gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm",
                      mostrarPromocao && "shadow-md ring-2 ring-destructive/30"
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
              <div ref={gridRef} />
              {catalogLoading ? (
                <div className={`${
                  visualizacao === "grade"
                    ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
                    : "space-y-3 sm:space-y-4"
                }`}>
                  {Array.from({ length: itensPorPagina }).map((_, index) => (
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

                  <ProductsPagination
                    paginaAtual={paginaAtual}
                    itensPorPagina={itensPorPagina}
                    totalItens={totalProdutos || produtosOrdenados.length}
                    itensVisiveisNaPagina={produtosOrdenados.length}
                    onPaginaChange={setPaginaAtual}
                    onItensPorPaginaChange={(n) => {
                      setItensPorPagina(n);
                      setPaginaAtual(1);
                    }}
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Nenhum produto encontrado com os filtros selecionados.
                  </p>
                </div>
              )}
            </div>
        </PageContainer>
      </main>
      <Footer />
    </div>
    </PullToRefresh>
  );
};

export default Products;
