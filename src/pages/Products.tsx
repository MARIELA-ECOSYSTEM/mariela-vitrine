import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeleton } from "@/components/ProductSkeleton";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductSearch } from "@/components/ProductSearch";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, List, Tag, Sparkles } from "lucide-react";
import { CATEGORIAS_DB } from "@/data/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Products = () => {
  const { produtos, loading } = useProducts();
  const [searchParams] = useSearchParams();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("todas");
  const [mostrarPromocao, setMostrarPromocao] = useState<boolean>(false);
  const [mostrarNovidades, setMostrarNovidades] = useState<boolean>(false);
  const [ordenarPor, setOrdenarPor] = useState<string>("padrao");
  const [coresSelecionadas, setCoresSelecionadas] = useState<string[]>([]);
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState<string[]>([]);
  const [visualizacao, setVisualizacao] = useState<"grade" | "lista">("grade");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const produtosPorPagina = 12;

  // Aplicar filtros da URL
  useEffect(() => {
    const filter = searchParams.get("filter");
    if (filter === "promocoes") {
      setMostrarPromocao(true);
    } else if (filter === "novidades") {
      setMostrarNovidades(true);
    }
  }, [searchParams]);

  // Calcular preço mínimo e máximo
  const { precoMin, precoMax } = useMemo(() => {
    if (produtos.length === 0) {
      return { precoMin: 0, precoMax: 0 };
    }
    const precos = produtos.map(p => p.emPromocao && p.precoPromocional ? p.precoPromocional : p.precoVenda);
    return {
      precoMin: Math.floor(Math.min(...precos)),
      precoMax: Math.ceil(Math.max(...precos))
    };
  }, [produtos]);

  const [faixaPreco, setFaixaPreco] = useState<[number, number]>([0, 0]);

  // Contador de filtros ativos
  const activeFiltersCount = 
    (categoriaSelecionada !== "todas" ? 1 : 0) +
    coresSelecionadas.length +
    tamanhosSelecionados.length +
    ((faixaPreco[0] > 0 || faixaPreco[1] > 0) && (faixaPreco[0] !== precoMin || faixaPreco[1] !== precoMax) ? 1 : 0);

  // Contagem de produtos por categoria - usando os valores corretos do banco
  const categoriasCount = useMemo(() => {
    const counts: Record<string, number> = {
      todas: produtos.length,
    };
    
    // Inicializar todas as categorias com 0
    CATEGORIAS_DB.forEach(cat => {
      if (cat.value !== "todas") {
        counts[cat.value] = 0;
      }
    });
    
    // Contar produtos por categoria
    produtos.forEach(p => {
      if (counts[p.categoria] !== undefined) {
        counts[p.categoria]++;
      }
    });
    
    return counts;
  }, [produtos]);

  // Atualizar faixa de preço quando produtos carregarem
  useEffect(() => {
    if (precoMin && precoMax && faixaPreco[0] === 0 && faixaPreco[1] === 0) {
      setFaixaPreco([precoMin, precoMax]);
    }
  }, [precoMin, precoMax]);
  
  // Reset página quando filtros mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [categoriaSelecionada, mostrarPromocao, mostrarNovidades, coresSelecionadas, tamanhosSelecionados]);

  // Filtrar produtos primeiro (sem cor e tamanho)
  const produtosFiltradosParcial = useMemo(() => {
    let filtrados = produtos;

    // Filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nome.toLowerCase().includes(query) ||
        p.categoria.toLowerCase().includes(query) ||
        p.variants.some(v => v.cor.toLowerCase().includes(query))
      );
    }
    
    // Filtro de categoria
    if (categoriaSelecionada !== "todas") {
      filtrados = filtrados.filter(p => p.categoria === categoriaSelecionada);
    }
    
    // Filtro de promoção
    if (mostrarPromocao) {
      filtrados = filtrados.filter(p => p.emPromocao);
    }
    
    // Filtro de novidades
    if (mostrarNovidades) {
      filtrados = filtrados.filter(p => p.isNovidade);
    }

    // Filtro de preço - só aplicar se faixaPreco foi configurado e é diferente do padrão
    if (faixaPreco[0] > 0 || faixaPreco[1] > 0) {
      if (faixaPreco[0] !== precoMin || faixaPreco[1] !== precoMax) {
        filtrados = filtrados.filter(p => {
          const preco = p.emPromocao && p.precoPromocional ? p.precoPromocional : p.precoVenda;
          return preco >= faixaPreco[0] && preco <= faixaPreco[1];
        });
      }
    }

    return filtrados;
  }, [produtos, categoriaSelecionada, mostrarPromocao, mostrarNovidades, faixaPreco, precoMin, precoMax, searchQuery]);

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
    setMostrarPromocao(false);
    setMostrarNovidades(false);
    setCoresSelecionadas([]);
    setTamanhosSelecionados([]);
    setFaixaPreco([precoMin, precoMax]);
    setPaginaAtual(1);
  };

  return (
    <div className="min-h-screen">
      {loading && <LoadingOverlay />}
      <Header />
      <main className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <Breadcrumbs currentPage="Todos os Produtos" />
          
          {/* Cabeçalho */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Todos os Produtos
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-6">
              Confira nossa coleção completa
            </p>
            
            {/* Busca com autocomplete */}
            <div className="flex justify-center">
              <ProductSearch
                produtos={produtos}
                onSearch={setSearchQuery}
                searchQuery={searchQuery}
              />
            </div>
          </div>

          {/* Filtros Rápidos - Promoção e Novidades */}
          <div className="flex justify-center gap-3 mb-8 animate-fade-in">
            <Button
              variant={mostrarPromocao ? "default" : "outline"}
              onClick={() => {
                setMostrarPromocao(!mostrarPromocao);
                setMostrarNovidades(false);
                setPaginaAtual(1);
              }}
              size="lg"
              className="gap-2 transition-all hover:scale-105"
            >
              <Tag className="h-5 w-5" />
              <span>Promoção</span>
              <Badge 
                variant={mostrarPromocao ? "secondary" : "outline"}
                className="ml-1"
              >
                {produtos.filter(p => p.emPromocao).length}
              </Badge>
            </Button>
            <Button
              variant={mostrarNovidades ? "default" : "outline"}
              onClick={() => {
                setMostrarNovidades(!mostrarNovidades);
                setMostrarPromocao(false);
                setPaginaAtual(1);
              }}
              size="lg"
              className="gap-2 transition-all hover:scale-105"
            >
              <Sparkles className="h-5 w-5" />
              <span>Novidades</span>
              <Badge 
                variant={mostrarNovidades ? "secondary" : "outline"}
                className="ml-1"
              >
                {produtos.filter(p => p.isNovidade).length}
              </Badge>
            </Button>
          </div>

          {/* Área de Produtos */}
          <div>
              {/* Barra de Controles */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                {/* Botão Filtros - Esquerda */}
                <div className="order-1 sm:order-1">
                  <ProductFilters
                    categoriaSelecionada={categoriaSelecionada}
                    setCategoriaSelecionada={setCategoriaSelecionada}
                    coresSelecionadas={coresSelecionadas}
                    setCoresSelecionadas={setCoresSelecionadas}
                    tamanhosSelecionados={tamanhosSelecionados}
                    setTamanhosSelecionados={setTamanhosSelecionados}
                    faixaPreco={faixaPreco}
                    setFaixaPreco={setFaixaPreco}
                    coresDisponiveis={coresDisponiveis}
                    tamanhosDisponiveis={tamanhosDisponiveis}
                    precoMin={precoMin}
                    precoMax={precoMax}
                    categoriasCount={categoriasCount}
                    produtos={produtos}
                    produtosFiltradosParcial={produtosFiltradosParcial}
                    onLimparFiltros={handleLimparFiltros}
                    setPaginaAtual={setPaginaAtual}
                    activeFiltersCount={activeFiltersCount}
                  />
                </div>

                {/* Contador - Centro */}
                <span className="text-sm font-medium text-muted-foreground order-2 sm:order-2">
                  {produtosOrdenados.length} {produtosOrdenados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
                </span>

                {/* Ordenação e Visualização - Direita */}
                <div className="flex gap-2 order-3 sm:order-3">
                  <Select value={ordenarPor} onValueChange={setOrdenarPor}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Padrão</SelectItem>
                      <SelectItem value="preco-asc">Menor Preço</SelectItem>
                      <SelectItem value="preco-desc">Maior Preço</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Toggle de visualização */}
                  <div className="flex border border-border rounded-lg overflow-hidden">
                    <Button
                      variant={visualizacao === "grade" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setVisualizacao("grade")}
                      className="rounded-none"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={visualizacao === "lista" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setVisualizacao("lista")}
                      className="rounded-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Grid/Lista de Produtos */}
              {loading ? (
                <div className={`${
                  visualizacao === "grade"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
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
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }`}>
                    {produtosOrdenados
                      .slice((paginaAtual - 1) * produtosPorPagina, paginaAtual * produtosPorPagina)
                      .map((produto, index) => (
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

                  {/* Paginação */}
                  {produtosOrdenados.length > produtosPorPagina && (
                    <div className="flex items-center justify-center gap-2 mt-12 animate-fade-in">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPaginaAtual(p => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={paginaAtual === 1}
                        className="transition-all hover:scale-105"
                      >
                        Anterior
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.ceil(produtosOrdenados.length / produtosPorPagina) }, (_, i) => i + 1).map((pagina) => (
                          <Button
                            key={pagina}
                            variant={paginaAtual === pagina ? "default" : "outline"}
                            onClick={() => {
                              setPaginaAtual(pagina);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            size="sm"
                            className="transition-all hover:scale-105"
                          >
                            {pagina}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPaginaAtual(p => Math.min(Math.ceil(produtosOrdenados.length / produtosPorPagina), p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={paginaAtual === Math.ceil(produtosOrdenados.length / produtosPorPagina)}
                        className="transition-all hover:scale-105"
                      >
                        Próxima
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
  );
};

export default Products;
