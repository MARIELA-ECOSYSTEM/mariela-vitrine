import { useState, useMemo, useEffect, useRef } from "react";
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
import { getUtm, trackProdutoVisualizadoOnce, trackWhatsappClick } from "@/services/vitrineTrackingService";
import { useSizeSelectionGuide } from "@/hooks/useSizeSelectionGuide";
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

  // Hook compartilhado: scroll com header dinâmico + destaque + aria-live + foco.
  const sizeGuide = useSizeSelectionGuide();
  const focarSelecaoTamanho = sizeGuide.guide;

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

  // Pré-carregamento controlado: pré-carrega APENAS as imagens adicionais da
  // cor selecionada (a primeira já é carregada pelo <img> principal). Não
  // pré-carregamos capas de outras cores para evitar requests desnecessários
  // no mobile e duplicação. O cleanup remove os <link> ao trocar de cor —
  // requests pendentes são cancelados pelo browser quando o link é removido
  // antes de completar, garantindo que apenas a última seleção atualize a UI.
  useEffect(() => {
    if (!imagensParaMostrar || imagensParaMostrar.length <= 1) return;
    // Pula o placeholder local — não há ganho em "prefetchar" import estático.
    const adicionais = imagensParaMostrar.slice(1).filter(
      (url) => typeof url === "string" && url && url !== produtoGenerico,
    );
    if (adicionais.length === 0) return;

    const links: HTMLLinkElement[] = [];
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    const schedule = (cb: () => void) =>
      typeof w.requestIdleCallback === "function" ? w.requestIdleCallback(cb) : setTimeout(cb, 300);

    let cancelled = false;
    schedule(() => {
      if (cancelled) return;
      // Deduplica para evitar múltiplos prefetch da mesma URL ao trocar rápido.
      const seen = new Set<string>();
      adicionais.forEach((url) => {
        if (seen.has(url)) return;
        seen.add(url);
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = url;
        link.fetchPriority = "low";
        document.head.appendChild(link);
        links.push(link);
      });
    });
    return () => {
      cancelled = true;
      links.forEach((l) => l.parentNode?.removeChild(l));
    };
  }, [imagensParaMostrar]);

  // Função para lidar com seleção de imagem do carrossel
  const handleImageSelect = (index: number) => {
    setImagemSelecionadaIndex(index);
  };

  useEffect(() => {
    if (!produto) return;

    vitrineApiService.getConfig().then((config) => {
      const preco = getDisplayPrice(produto);
      const precoFormatadoSeo = formatBRL(preco);
      const promoSeo = getPromoInfo(produto);
      const colecaoTexto = produto.colecao ? ` da coleção ${produto.colecao}` : "";
      // Para share/SEO prioriza imagem da cor selecionada (quando houver) → primeira da galeria
      // → fallback produto.imagens[0]. Garante OG/twitter cards alinhados com a vitrine.
      const imagemPrincipal =
        imagensParaMostrar[0]
        || corSelecionadaObj?.imagem_full
        || corSelecionadaObj?.imagem_thumb
        || produto.imagens[0];

      // Title dinâmico: inclui preço quando em promoção (maior CTR em SERPs).
      const seoTitle = promoSeo.isPromo
        ? `${produto.nome} por ${precoFormatadoSeo} | ${config.nomeLoja}`
        : `${produto.nome} | ${config.nomeLoja}`;

      // Description dinâmica orientada a CTR. Só inclui cores quando reais.
      const coresReais = (produto.cores || [])
        .map((c) => c.cor)
        .filter((c): c is string => !!c && c.toLowerCase() !== "única" && c.toLowerCase() !== "unica");
      const coresTexto = coresReais.length > 0
        ? ` Disponível nas cores ${coresReais.slice(0, 4).join(", ")}${coresReais.length > 4 ? "…" : ""}.`
        : "";

      const seoDescription = promoSeo.isPromo
        ? `🔥 ${produto.nome} em promoção por ${precoFormatadoSeo}${
            promoSeo.precoVenda > 0 ? ` (antes ${formatBRL(promoSeo.precoVenda)})` : ""
          }. Aproveite na ${config.nomeLoja}.`
        : `Confira ${produto.nome}${colecaoTexto} na ${config.nomeLoja} por ${precoFormatadoSeo}.${coresTexto}`;

      updateSeo({
        title: seoTitle,
        description: seoDescription,
        image: imagemPrincipal,
        imageWidth: 1200,
        imageHeight: 1200,
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
            description: produto.descricao || seoDescription,
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

  // Estado seguro: produto sem variações reais (sem cores válidas para roupas
  // ou sem nenhum tamanho disponível) é tratado como indisponível.
  const produtoIndisponivel = !isAcessorio && (
    coresList.length === 0 ||
    coresList.every((c) => c.tamanhos.length === 0)
  );

  const promo = getPromoInfo(produto);
  const precoFormatado = formatBRL(getDisplayPrice(produto));
  const precoOriginalFormatado = promo.isPromo ? formatBRL(promo.precoVenda) : undefined;

  const handleAdicionarCarrinho = () => {
    if (produtoIndisponivel) {
      toast({
        title: "Produto indisponível",
        description: "Este produto não está disponível no momento.",
        variant: "destructive",
      });
      return;
    }
    const tamanhoParaAdicionar = isAcessorio ? "U" : tamanhoSelecionado;
    const corParaAdicionar = corSelecionada;

    // Valida cor real (precisa existir na lista atual de cores).
    const corValida = !isAcessorio && !!corParaAdicionar
      && coresList.some((c) => c.cor === corParaAdicionar);
    if (!isAcessorio && !corValida) {
      // UX guiada: mesmo padrão do botão WhatsApp — scroll + destaque + aria-live.
      focarSelecaoTamanho();
      return;
    }

    // Valida tamanho real (precisa existir nos tamanhos da cor selecionada).
    const tamanhoValido = !!tamanhoParaAdicionar && (
      isAcessorio || tamanhosDisponiveis.includes(tamanhoParaAdicionar)
    );
    if (!tamanhoValido) {
      // UX guiada: mesmo padrão do botão WhatsApp — scroll + destaque + aria-live.
      focarSelecaoTamanho();
      return;
    }
    
    addToCart(produto, tamanhoParaAdicionar);
    toast({
      title: "Produto adicionado!",
      description: `${produto.nome} (${corParaAdicionar} - ${tamanhoParaAdicionar}) foi adicionado ao carrinho.`,
    });
  };

  const handleWhatsApp = () => {
    if (produtoIndisponivel) {
      toast({
        title: "Produto indisponível",
        description: "Este produto não está disponível no momento.",
        variant: "destructive",
      });
      return;
    }
    const tamanhoParaUsar = isAcessorio ? "U" : tamanhoSelecionado;

    // Valida cor real (precisa existir na lista atual).
    const corValida = !isAcessorio && !!corSelecionada
      && coresList.some((c) => c.cor === corSelecionada);
    if (!isAcessorio && !corValida) {
      // UX guiada: rola até a seção de variantes e destaca, sem toast agressivo.
      focarSelecaoTamanho();
      return;
    }

    // Valida tamanho real para roupas; acessórios usam "U" interno.
    const tamanhoValido = !!tamanhoParaUsar && (
      isAcessorio || tamanhosDisponiveis.includes(tamanhoParaUsar)
    );
    if (!tamanhoValido) {
      // UX guiada: rola até a seleção de tamanhos e destaca a área.
      focarSelecaoTamanho();
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
      const utm = getUtm();
      trackWhatsappClick(produto.produtoId || produto.id, "detalhe", {
        cor: corSelecionada || undefined,
        tamanho: tamanhoParaUsar || undefined,
        utm_source: utm.utm_source ?? "whatsapp",
        utm_medium: utm.utm_medium ?? "product_cta",
        utm_campaign: utm.utm_campaign ?? "vitrine",
        utm_content: utm.utm_content ?? String(produto.id),
      });
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
                              // Preserva tamanho se ainda existir na nova cor; senão limpa.
                              // Se houver apenas 1 tamanho disponível, auto-seleciona.
                              if (tamanhoSelecionado && tamanhosDaCor.includes(tamanhoSelecionado)) {
                                // mantém
                              } else if (tamanhosDaCor.length === 1) {
                                setTamanhoSelecionado(tamanhosDaCor[0]);
                              } else {
                                setTamanhoSelecionado("");
                              }
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
                    <div
                      ref={sizeGuide.sectionRef}
                      tabIndex={-1}
                      className={`space-y-3 animate-fade-in scroll-mt-24 rounded-lg transition-all duration-300 ${
                        sizeGuide.highlight
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_0_4px_hsl(var(--primary)/0.15)] p-3 -m-3 animate-pulse"
                          : ""
                      }`}
                    >
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
                            data-size-option
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
                {/* Região acessível para anunciar a necessidade de selecionar
                    um tamanho a leitores de tela. Visualmente oculta. */}
                <p
                  aria-live="polite"
                  aria-atomic="true"
                  className="sr-only"
                >
                  {sizeGuide.announceMessage}
                </p>
                {produtoIndisponivel && (
                  <p
                    role="status"
                    className="text-sm text-muted-foreground text-center bg-muted/50 border border-border rounded-md py-2 px-3"
                  >
                    Produto indisponível no momento.
                  </p>
                )}
                <Button
                  size="lg"
                  onClick={handleAdicionarCarrinho}
                  disabled={produtoIndisponivel}
                  className="w-full gap-2 text-base md:text-lg h-12 md:h-14 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {!isAcessorio && !tamanhoSelecionado
                    ? "Selecione o tamanho"
                    : "Adicionar ao Carrinho"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleWhatsApp}
                  disabled={produtoIndisponivel}
                  className="w-full gap-2 text-base md:text-lg h-12 md:h-14 transition-all hover:scale-[1.02] active:scale-[0.98] border-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  {!isAcessorio && !tamanhoSelecionado
                    ? "Selecione o tamanho"
                    : "Comprar pelo WhatsApp"}
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
