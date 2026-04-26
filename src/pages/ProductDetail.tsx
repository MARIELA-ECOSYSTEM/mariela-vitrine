import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageContainer } from "@/components/PageContainer";
import { ImageGallery } from "@/components/ImageGallery";
import { SizeGuide } from "@/components/SizeGuide";
import { RelatedProducts } from "@/components/RelatedProducts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, ShoppingCart, ArrowLeft } from "lucide-react";
import { absoluteUrl, updateSeo } from "@/lib/seo";
import { vitrineApiService } from "@/services/vitrineApiService";
import { getProductPath, getProductShareMessage, getTrackedProductUrl, matchesProductSlug } from "@/lib/productLinks";
import { formatBRL, getDisplayPrice, getPromoInfo } from "@/lib/formatters";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { getPublicProductBadge } from "@/services/productInsightsService";
import { trackProdutoVisualizadoOnce, trackWhatsappClick } from "@/services/vitrineTrackingService";
import type { Produto } from "@/data/products";
import produtoGenerico from "@/assets/produto-generico.png";

// Mapa de cores para as amostras visuais
const COLOR_MAP: Record<string, string> = {
  "Preto": "#000000",
  "Branco": "#FFFFFF",
  "Vermelho": "#DC2626",
  "Azul": "#2563EB",
  "Verde": "#16A34A",
  "Amarelo": "#EAB308",
  "Rosa": "#EC4899",
  "Roxo": "#9333EA",
  "Laranja": "#EA580C",
  "Marrom": "#92400E",
  "Cinza": "#6B7280",
  "Bege": "#D4C5B9",
  "Nude": "#E5D4C1",
  "Caqui": "#BDB76B",
  "Vinho": "#722F37",
  "Mostarda": "#FFDB58",
  "Off White": "#F8F8F8",
  "Caramelo": "#C68642",
};

const ProductDetail = () => {
  const { id } = useParams();
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { produtos, loading } = useProducts();
  
  const productParam = id ?? slug;
  const produtoFromList = produtos.find(p => matchesProductSlug(p, productParam));
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  // Inicializa a partir da query string para suportar share/bookmark
  const initialQuery = useMemo(() => new URLSearchParams(location.search), []);
  const [corSelecionadaId, setCorSelecionadaId] = useState<string>("");

  // Sempre busca o detalhe completo (com cores reais) ao abrir /products/{slug},
  // invalidando o cache antes para evitar reutilizar resposta antiga sem `cores`.
  useEffect(() => {
    if (!produtoFromList) {
      setProdutoDetalhe(null);
      return;
    }
    let cancelled = false;
    const idDetalhe = produtoFromList.produtoId || produtoFromList.codigoProduto || String(produtoFromList.id);
    // Invalida explicitamente o cache desse detalhe antes de buscar.
    vitrineApiService.invalidateProdutoCache(idDetalhe);
    setLoadingDetalhe(true);
    vitrineApiService
      .getProdutoById(idDetalhe)
      .then((detalhe) => {
        if (!cancelled && detalhe) setProdutoDetalhe(detalhe);
      })
      .catch(() => { /* silencioso — fallback permanece o produto da lista */ })
      .finally(() => {
        if (!cancelled) setLoadingDetalhe(false);
      });
    return () => { cancelled = true; };
  }, [produtoFromList?.produtoId, produtoFromList?.id]);

  // Produto efetivo: prioriza o detalhe completo (com cores reais) quando disponível.
  const produto = produtoDetalhe ?? produtoFromList;
  const [corSelecionada, setCorSelecionada] = useState<string>(initialQuery.get("cor") || "");
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string>(initialQuery.get("tamanho") || "");
  const [imagemSelecionadaIndex, setImagemSelecionadaIndex] = useState(0);
  
  const whatsappNumber = "5583986567915";

  useEffect(() => {
    if (!produto || !id) return;
    navigate(`${getProductPath(produto)}${location.search}`, { replace: true });
  }, [id, location.search, navigate, produto]);

  // Tracking: produto_visualizado (1x por sessão por produto)
  useEffect(() => {
    if (!produto) return;
    const trackingId = produto.produtoId || produto.id;
    trackProdutoVisualizadoOnce(trackingId, "detalhe");
  }, [produto]);

  // Cores reais do contrato novo (produto.cores). Se ausente, deriva de variants (legado),
  // descartando a entrada "Única" quando houver outras cores reais presentes.
  // Inclui `imagens[]` (galeria por cor) quando o detalhe trouxer.
  type CorListItem = {
    produto_cor_id: string;
    cor: string;
    tamanhos: string[];
    imagem_full: string | null;
    imagem_thumb: string | null;
    imagens: Array<{ url_full: string; url_thumb: string }>;
  };
  const coresList = useMemo<CorListItem[]>(() => {
    if (!produto) return [];
    if (produto.cores && produto.cores.length > 0) {
      return produto.cores
        .filter((c) => c.tamanhos.some((t) => t.disponibilidade > 0))
        .map((c) => {
          // Galeria da cor: prioriza `imagens[]` do detalhe; senão deriva de imagem_full/thumb.
          const galeria = (c.imagens && c.imagens.length > 0
            ? c.imagens
            : c.imagem_full || c.imagem_thumb
              ? [{ url_full: c.imagem_full, url_thumb: c.imagem_thumb, principal: true, ordem: 0 }]
              : []
          )
            .map((img) => {
              const full = img.url_full || img.url_thumb || "";
              const thumb = img.url_thumb || img.url_full || "";
              return full ? { url_full: full, url_thumb: thumb || full } : null;
            })
            .filter((x): x is { url_full: string; url_thumb: string } => !!x);
          return {
            produto_cor_id: c.produto_cor_id,
            cor: c.cor,
            tamanhos: c.tamanhos.filter((t) => t.disponibilidade > 0).map((t) => t.tamanho),
            imagem_full: c.imagem_full,
            imagem_thumb: c.imagem_thumb,
            imagens: galeria,
          };
        });
    }
    // Fallback (legado): derivar de variants
    const map: Record<string, string[]> = {};
    produto.variants
      .filter((v) => v.disponibilidade > 0)
      .forEach((v) => {
        if (!map[v.cor]) map[v.cor] = [];
        if (!map[v.cor].includes(v.tamanho)) map[v.cor].push(v.tamanho);
      });
    return Object.entries(map).map(([cor, tamanhos]) => ({
      produto_cor_id: cor,
      cor,
      tamanhos,
      imagem_full: null,
      imagem_thumb: null,
      imagens: [],
    }));
  }, [produto]);

  const corSelecionadaObj = useMemo(
    () => coresList.find((c) => c.produto_cor_id === corSelecionadaId) || coresList.find((c) => c.cor === corSelecionada),
    [coresList, corSelecionadaId, corSelecionada],
  );

  const coresDisponiveis = useMemo(() => coresList.map((c) => c.cor), [coresList]);
  const tamanhosDisponiveis = corSelecionadaObj?.tamanhos ?? [];
  const coresTamanhosMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    coresList.forEach((c) => { map[c.cor] = c.tamanhos; });
    return map;
  }, [coresList]);

  // Galeria efetiva exibida no <ImageGallery>:
  // 1) Se a cor selecionada tem `imagens[]` (detalhe completo), usa só elas.
  // 2) Senão, usa imagem_full/imagem_thumb da cor + restante do produto.imagens.
  // 3) Senão, usa produto.imagens.
  // 4) Fallback final (imagem é a ÚNICA exceção permitida): placeholder genérico,
  //    para evitar layout vazio sem inventar dados de produto.
  const imagensParaMostrar = useMemo(() => {
    if (!produto) return [] as string[];
    if (corSelecionadaObj && corSelecionadaObj.imagens.length > 0) {
      // Galeria por cor — fonte canônica quando o detalhe trouxer.
      return corSelecionadaObj.imagens.map((img) => img.url_full);
    }
    if (corSelecionadaObj && (corSelecionadaObj.imagem_full || corSelecionadaObj.imagem_thumb)) {
      const principal = corSelecionadaObj.imagem_full || corSelecionadaObj.imagem_thumb!;
      const restantes = produto.imagens.filter((img) => img !== principal);
      return [principal, ...restantes];
    }
    if (produto.imagens.length > 0) return produto.imagens;
    return [produtoGenerico];
  }, [produto, corSelecionadaObj]);

  // Ao trocar cor, volta para a primeira imagem (que agora corresponde à cor selecionada).
  useEffect(() => {
    if (!corSelecionadaObj) return;
    setImagemSelecionadaIndex(0);
  }, [corSelecionadaObj?.produto_cor_id]);

  // Auto-seleciona a cor com base na query string (?cor=...) ou na primeira disponível.
  useEffect(() => {
    if (coresList.length === 0) return;
    if (corSelecionadaId && coresList.some((c) => c.produto_cor_id === corSelecionadaId)) return;
    const corNaUrl = initialQuery.get("cor");
    const fromUrl = corNaUrl ? coresList.find((c) => c.cor.toLowerCase() === corNaUrl.toLowerCase()) : null;
    const escolhida = fromUrl || coresList[0];
    setCorSelecionada(escolhida.cor);
    setCorSelecionadaId(escolhida.produto_cor_id);
  }, [coresList, corSelecionadaId, initialQuery]);

  // Valida o tamanho da query string contra a cor selecionada; remove se inválido.
  useEffect(() => {
    if (!tamanhoSelecionado) return;
    if (tamanhosDisponiveis.length === 0) return;
    if (!tamanhosDisponiveis.includes(tamanhoSelecionado)) {
      setTamanhoSelecionado("");
    }
  }, [tamanhosDisponiveis, tamanhoSelecionado]);

  // Persiste cor/tamanho na URL (sem recarregar) para permitir share da seleção exata.
  useEffect(() => {
    if (!produto) return;
    const params = new URLSearchParams(location.search);
    if (corSelecionada) params.set("cor", corSelecionada);
    else params.delete("cor");
    if (tamanhoSelecionado) params.set("tamanho", tamanhoSelecionado);
    else params.delete("tamanho");
    const next = params.toString();
    const target = `${location.pathname}${next ? `?${next}` : ""}`;
    if (target !== `${location.pathname}${location.search}`) {
      navigate(target, { replace: true });
    }
  }, [corSelecionada, tamanhoSelecionado, produto, location.pathname, location.search, navigate]);

  // Pré-carregamento leve das imagens de cada cor (lazy + low priority) para evitar
  // flash de troca ao alternar cores no mobile, sem pesar o carregamento inicial.
  useEffect(() => {
    if (coresList.length <= 1) return;
    const links: HTMLLinkElement[] = [];
    // Aguarda 1 frame ocioso para não competir com a imagem principal.
    const schedule = (cb: () => void) => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb);
      else setTimeout(cb, 300);
    };
    schedule(() => {
      coresList.forEach((c) => {
        // Pré-carrega só a primeira imagem de cada outra cor (capa) — evita pesar o mobile.
        const url = c.imagens[0]?.url_full || c.imagem_full || c.imagem_thumb;
        if (!url) return;
        const atual = corSelecionadaObj?.imagens[0]?.url_full
          || corSelecionadaObj?.imagem_full
          || corSelecionadaObj?.imagem_thumb;
        if (atual && url === atual) return;
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = url;
        link.fetchPriority = "low";
        document.head.appendChild(link);
        links.push(link);
      });
    });
    return () => { links.forEach((l) => l.parentNode?.removeChild(l)); };
  }, [coresList, corSelecionadaObj]);

  // Função para lidar com seleção de imagem do carrossel
  const handleImageSelect = (index: number) => {
    setImagemSelecionadaIndex(index);
  };

  useEffect(() => {
    if (!produto) return;

    vitrineApiService.getConfig().then((config) => {
      const preco = getDisplayPrice(produto);
      const precoFormatadoSeo = formatBRL(preco);
      const colecaoTexto = produto.colecao ? ` da coleção ${produto.colecao}` : "";
      const descricao = produto.descricao || `${produto.nome}${colecaoTexto}. Loja de moda feminina em Campina Grande - PB.`;
      // Para share/SEO prioriza imagem da cor selecionada (quando houver) → primeira da galeria
      // → fallback produto.imagens[0]. Garante OG/twitter cards alinhados com a vitrine.
      const imagemPrincipal =
        imagensParaMostrar[0]
        || corSelecionadaObj?.imagem_full
        || corSelecionadaObj?.imagem_thumb
        || produto.imagens[0];

      updateSeo({
        title: `${produto.nome} | ${config.nomeLoja}`,
        description: produto.emPromocao
          ? `${produto.nome} em promoção por ${precoFormatadoSeo} na ${config.nomeLoja}${colecaoTexto ? `, ${colecaoTexto.trim()}` : ""}.`
          : `${produto.nome}${colecaoTexto}. Disponível na ${config.nomeLoja} por ${precoFormatadoSeo}.`,
        image: imagemPrincipal,
        url: `${window.location.origin}${getProductPath(produto)}`,
        type: "product",
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
              {
                "@type": "ListItem",
                position: 3,
                name: produto.nome,
                item: `${window.location.origin}${getProductPath(produto)}`,
              },
            ],
          },
          {
            "@type": "Product",
            name: produto.nome,
            image: absoluteUrl(imagemPrincipal),
            description: descricao,
            brand: {
              "@type": "Brand",
              name: config.nomeLoja,
            },
            breadcrumb: {
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
                {
                  "@type": "ListItem",
                  position: 3,
                  name: produto.nome,
                  item: `${window.location.origin}${getProductPath(produto)}`,
                },
              ],
            },
            offers: {
              "@type": "Offer",
              price: preco.toFixed(2),
              priceCurrency: "BRL",
              availability: "https://schema.org/InStock",
              url: `${window.location.origin}${getProductPath(produto)}`,
            },
          },
        ],
      });
    });
  }, [produto, imagensParaMostrar, corSelecionadaObj]);

  if (loading || (loadingDetalhe && !produtoDetalhe && !produtoFromList)) {
    return <LoadingOverlay />;
  }

  if (!produto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
          <Link to="/products">
            <Button>Voltar para Produtos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAcessorio = produto.categoria === "bolsas" || produto.categoria === "acessorios";
  const publicBadge = getPublicProductBadge(produto);

  const promo = getPromoInfo(produto);
  const precoFormatado = formatBRL(getDisplayPrice(produto));
  const precoOriginalFormatado = promo.isPromo ? formatBRL(promo.precoVenda) : undefined;

  const handleAdicionarCarrinho = () => {
    const tamanhoParaAdicionar = isAcessorio ? "U" : tamanhoSelecionado;
    const corParaAdicionar = corSelecionada;

    if (!isAcessorio && !corParaAdicionar) {
      toast({
        title: "Selecione uma cor",
        description: "Por favor, escolha a cor antes de adicionar ao carrinho.",
        variant: "destructive",
      });
      return;
    }
    
    if (!tamanhoParaAdicionar) {
      toast({
        title: "Selecione um tamanho",
        description: "Por favor, escolha o tamanho antes de adicionar ao carrinho.",
        variant: "destructive",
      });
      return;
    }
    
    addToCart(produto, tamanhoParaAdicionar);
    toast({
      title: "Produto adicionado!",
      description: `${produto.nome} (${corParaAdicionar} - ${tamanhoParaAdicionar}) foi adicionado ao carrinho.`,
    });
  };

  const handleWhatsApp = () => {
    const tamanhoParaUsar = isAcessorio ? "U" : tamanhoSelecionado;

    if (!isAcessorio && !corSelecionada) {
      toast({
        title: "Selecione uma cor",
        description: "Por favor, escolha a cor antes de enviar pelo WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    
    if (!tamanhoParaUsar) {
      toast({
        title: "Selecione um tamanho",
        description: "Por favor, escolha o tamanho antes de enviar pelo WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    
    const productLink = getTrackedProductUrl(produto);
    const message = getProductShareMessage(produto, {
      cor: corSelecionada || undefined,
      tamanho: tamanhoParaUsar || undefined,
      url: productLink,
    });
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    try {
      trackWhatsappClick(produto.produtoId || produto.id, "detalhe");
    } catch {
      /* nunca bloquear o clique */
    }
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background pt-[60px] sm:pt-[68px]">
      <Header />
      <main className="pb-8 md:pb-16">
        <PageContainer padX="px-4 md:px-6" padY="pt-6 md:pt-8" className="animate-fade-in">
          {/* Breadcrumbs - Hidden on mobile for cleaner look */}
          <div className="hidden md:block mb-4">
            <Breadcrumbs 
              items={[{ label: "Produtos", path: "/products" }]} 
              currentPage={produto.nome} 
            />
          </div>
          
          {/* Back Button - Mobile optimized */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 md:mb-6 gap-1.5 hover:scale-105 transition-all -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar</span>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 max-w-6xl mx-auto">
            {/* Galeria de Imagens */}
            <div className="animate-fade-in">
              <ImageGallery
                images={imagensParaMostrar}
                productName={produto.nome}
                emPromocao={produto.emPromocao}
                isNovidade={produto.isNovidade}
                  publicBadge={publicBadge}
                selectedIndex={imagemSelecionadaIndex}
                onImageSelect={handleImageSelect}
              />
            </div>

            {/* Product Info */}
            <div className="space-y-4 md:space-y-6">
              {/* Nome do Produto */}
              <div>
                <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground leading-tight">
                  {produto.nome}
                </h1>
              </div>

              {/* Preço */}
              <div className="flex items-baseline gap-3 flex-wrap">
                {promo.isPromo && precoOriginalFormatado && (
                  <p className="text-lg md:text-2xl text-muted-foreground line-through">
                    {precoOriginalFormatado}
                  </p>
                )}
                <p className={`text-3xl md:text-4xl font-bold ${promo.isPromo ? 'text-destructive' : 'text-primary'}`}>
                  {precoFormatado}
                </p>
                {promo.isPromo && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="destructive" className="text-xs">
                      {promo.badgeLabel}
                    </Badge>
                    {promo.economiaValor > 0 && (
                      <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">
                        Economize {formatBRL(promo.economiaValor)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Descrição */}
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                {produto.descricao}
              </p>

              {/* Categoria Badge + Guia de Medidas */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Categoria:</span>
                  <Badge variant="secondary" className="capitalize">
                    {produto.categoria}
                  </Badge>
                </div>
                {!isAcessorio && <SizeGuide categoria={produto.categoria} />}
              </div>

              {/* Seleção de Variantes */}
              {!isAcessorio && (
                <div className="space-y-5 pt-2">
                  {/* Seletor de Cor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm md:text-base">
                        Cor: <span className="text-primary font-semibold">{corSelecionada || "Selecione"}</span>
                      </p>
                      {corSelecionada && (
                        <span className="text-xs text-muted-foreground">
                          {coresDisponiveis.length} {coresDisponiveis.length === 1 ? 'cor disponível' : 'cores disponíveis'}
                        </span>
                      )}
                    </div>
                    
                    {/* Grid de Cores com Tamanhos */}
                    <div className="flex flex-col gap-2">
                      {coresList.map((corItem) => {
                        const cor = corItem.cor;
                        const tamanhosDaCor = corItem.tamanhos;
                        const isSelected = corSelecionadaId
                          ? corSelecionadaId === corItem.produto_cor_id
                          : corSelecionada === cor;
                        
                        return (
                          <button
                            key={corItem.produto_cor_id}
                            onClick={() => {
                              setCorSelecionada(cor);
                              setCorSelecionadaId(corItem.produto_cor_id);
                              setTamanhoSelecionado("");
                            }}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-md"
                                : "border-border hover:border-primary/50 bg-background"
                            }`}
                          >
                            <span 
                              className={`w-6 h-6 rounded-full border-2 shadow-inner transition-transform group-hover:scale-110 flex-shrink-0 ${
                                isSelected ? "border-primary" : "border-muted"
                              }`}
                              style={{ 
                                backgroundColor: COLOR_MAP[cor] || "#94A3B8",
                                boxShadow: (cor === "Branco" || cor === "Off White") 
                                  ? "inset 0 0 0 1px #E2E8F0, 0 1px 2px rgba(0,0,0,0.1)" 
                                  : "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }}
                            />
                            <div className="flex flex-col items-start gap-0.5 flex-1">
                              <span className={`text-sm font-semibold ${
                                isSelected ? "text-primary" : "text-foreground"
                              }`}>
                                {cor}
                              </span>
                              <span className={`text-xs ${
                                isSelected ? "text-primary/70" : "text-muted-foreground"
                              }`}>
                                Tamanhos: {tamanhosDaCor.join(" · ")}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="text-primary text-xs font-medium">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seletor de Tamanho */}
                  {corSelecionada && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm md:text-base">
                          Tamanho: <span className="text-primary font-semibold">{tamanhoSelecionado || "Selecione"}</span>
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {tamanhosDisponiveis.length} {tamanhosDisponiveis.length === 1 ? 'tamanho disponível' : 'tamanhos disponíveis'}
                        </span>
                      </div>
                      
                      {/* Grid de Tamanhos - Mobile friendly */}
                      <div className="flex flex-wrap gap-2">
                        {tamanhosDisponiveis.map((tamanho) => (
                          <button
                            key={tamanho}
                            onClick={() => setTamanhoSelecionado(tamanho)}
                            className={`min-w-[48px] h-12 px-4 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                              tamanhoSelecionado === tamanho
                                ? "border-primary bg-primary text-primary-foreground shadow-md"
                                : "border-border hover:border-primary/50 bg-background text-foreground"
                            }`}
                          >
                            {tamanho}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="space-y-3 pt-4">
                <Button
                  size="lg"
                  onClick={handleAdicionarCarrinho}
                  className="w-full gap-2 text-base md:text-lg h-12 md:h-14 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="w-full gap-2 text-base md:text-lg h-12 md:h-14 transition-all hover:scale-[1.02] active:scale-[0.98] border-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  Comprar pelo WhatsApp
                </Button>
              </div>

              {/* Info adicional mobile */}
              <div className="md:hidden pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Toque na imagem para ampliar • Deslize para ver mais fotos
                </p>
              </div>
            </div>
          </div>

          {/* Look completo / Produtos relacionados por coleção */}
          <div className="max-w-6xl mx-auto">
            <RelatedProducts
              currentProduct={produto}
              allProducts={produtos}
              title="Complete o look"
            />
          </div>
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
