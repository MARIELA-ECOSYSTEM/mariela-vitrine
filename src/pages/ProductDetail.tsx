import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { ProductDetailSkeleton } from "@/components/ProductDetailSkeleton";
import { getPublicProductBadge } from "@/services/productInsightsService";
import { getUtm, trackProdutoVisualizadoOnce, trackWhatsappClick } from "@/services/vitrineTrackingService";
import { useSizeSelectionGuide } from "@/hooks/useSizeSelectionGuide";
import type { Produto } from "@/data/products";
import { PRODUCT_IMAGE_PLACEHOLDER as produtoGenerico } from "@/lib/productImage";
import { preloadImagesPrioritized } from "@/components/ProductImageSkeleton";

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
  // Marca o id já buscado para evitar refetch quando `produtoFromList` muda de
  // referência (ex.: refresh silencioso da lista pelo `useProducts`).
  const fetchedIdRef = useRef<string | null>(null);

  // Chave estável de localStorage para persistir a seleção de cor/imagem por
  // produto. Não dispara navegação — apenas grava no storage e restaura no
  // mount. A URL continua sendo a fonte canônica para sharing.
  const STORAGE_PREFIX = "mariela_pdp_selection";
  const storageKeyForProduct = (pid: string | number) => `${STORAGE_PREFIX}:${String(pid)}`;
  // Inicializa a partir da query string para suportar share/bookmark
  const initialQuery = useMemo(() => new URLSearchParams(location.search), []);
  const [corSelecionadaId, setCorSelecionadaId] = useState<string>("");

  // Busca o detalhe completo UMA VEZ por id de produto. Evita o "flicker de
  // reload" causado por refetches em cascata quando a lista (`produtos`) é
  // refrescada silenciosamente em background ou quando a query string muda.
  // Também não invalida o cache aqui — confiamos no TTL do serviço.
  useEffect(() => {
    if (!produtoFromList) {
      setProdutoDetalhe(null);
      fetchedIdRef.current = null;
      return;
    }
    const idDetalhe = produtoFromList.produtoId || produtoFromList.codigoProduto || String(produtoFromList.id);
    if (fetchedIdRef.current === idDetalhe) return; // já buscado, não refaz
    let cancelled = false;
    fetchedIdRef.current = idDetalhe;
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
  }, [produtoFromList?.produtoId, produtoFromList?.id, produtoFromList?.codigoProduto]);

  // Produto efetivo: prioriza o detalhe completo (com cores reais) quando disponível.
  const produto = produtoDetalhe ?? produtoFromList;
  const [corSelecionada, setCorSelecionada] = useState<string>(initialQuery.get("cor") || "");
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string>(initialQuery.get("tamanho") || "");
  const [imagemSelecionadaIndex, setImagemSelecionadaIndex] = useState(0);
  
  const whatsappNumber = "5583986567915";

  // Hook compartilhado: scroll com header dinâmico + destaque + aria-live + foco.
  const sizeGuide = useSizeSelectionGuide();
  const focarSelecaoTamanho = sizeGuide.guide;

  // Redirect 1x do path legado (`/produto/:id`) para o slug canônico.
  // Não depende de `location.search` para não re-disparar quando os filtros
  // de cor/tamanho mudarem na URL (que é exatamente o caso do "reload visual").
  const didRedirectLegacyRef = useRef(false);
  useEffect(() => {
    if (!produto || !id) return;
    if (didRedirectLegacyRef.current) return;
    didRedirectLegacyRef.current = true;
    navigate(`${getProductPath(produto)}${window.location.search}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, produto?.id]);

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

  // Galeria UNIFICADA exibida no <ImageGallery>:
  // Mostra TODAS as imagens do produto (todas as cores) como uma só lista,
  // permitindo que o usuário navegue por setas e thumbnails entre cores.
  // Cada entrada carrega a `cor` à qual pertence — usado para sincronização
  // bidirecional cor ↔ imagem (mesma regra do ProductCard).
  type GalleryEntry = { url: string; cor: string | null };
  // Normaliza URLs para deduplicação: remove querystring de redimensionamento
  // (ex.: ?w=800&q=75 vs ?w=300&q=70 são variantes da MESMA foto e não devem
  // virar duas miniaturas distintas na galeria).
  const normalizeImageKey = (url: string): string => {
    try {
      const u = new URL(url, window.location.origin);
      // Remove parâmetros conhecidos de resize/quality que geram variantes
      // visualmente equivalentes.
      ["w", "h", "q", "width", "height", "quality", "fit", "auto", "dpr"].forEach((k) =>
        u.searchParams.delete(k),
      );
      return `${u.origin}${u.pathname}?${u.searchParams.toString()}`;
    } catch {
      return url.split("?")[0];
    }
  };
  const galeriaUnificada = useMemo<GalleryEntry[]>(() => {
    if (!produto) return [];
    const entries: GalleryEntry[] = [];
    const seen = new Set<string>();
    const push = (url: string | null | undefined, cor: string | null) => {
      const u = (url || "").trim();
      if (!u) return;
      const key = normalizeImageKey(u);
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({ url: u, cor });
    };
    // Verifica se TODAS as cores trazem `imagens[]` próprio (caso típico do
    // detalhe completo) — nesse caso a galeria por cor é canônica e não
    // devemos misturar `produto.imagens` (agregado pelo serviço) para evitar
    // duplicatas de thumbs/variantes da mesma foto.
    const todasCoresTemImagens =
      coresList.length > 0 && coresList.every((c) => c.imagens.length > 0);
    if (coresList.length > 0) {
      coresList.forEach((c) => {
        if (c.imagens.length > 0) {
          c.imagens.forEach((img) => push(img.url_full, c.cor));
        } else {
          // Só uma das duas — full tem prioridade, thumb é variante da mesma
          // foto e não deve gerar entrada extra.
          push(c.imagem_full || c.imagem_thumb, c.cor);
        }
      });
    }
    // Imagens "soltas" do produto: só inclui quando há lacuna (alguma cor sem
    // `imagens[]` ou catálogo sem cores). Caso contrário, a galeria por cor
    // já é completa e canônica.
    if (!todasCoresTemImagens) {
      (produto.imagens || []).forEach((img) => push(img, null));
    }
    if (entries.length === 0) entries.push({ url: produtoGenerico, cor: null });
    return entries;
  }, [produto, coresList]);

  const imagensParaMostrar = useMemo(
    () => galeriaUnificada.map((g) => g.url),
    [galeriaUnificada],
  );

  // Mapas auxiliares para sync bidirecional cor ↔ imagem.
  const primeiraImagemPorCor = useMemo(() => {
    const map: Record<string, number> = {};
    galeriaUnificada.forEach((g, idx) => {
      if (g.cor && !(g.cor in map)) map[g.cor] = idx;
    });
    return map;
  }, [galeriaUnificada]);

  // Preload antecipado das imagens de TODAS as cores em background. A cor
  // selecionada e a próxima da lista entram como prioridade imediata; o
  // restante carrega em idle. Respeita o cache global do ProductImageSkeleton
  // e nunca duplica fetch para a mesma URL.
  useEffect(() => {
    if (coresList.length === 0) return;
    const selectedIndex = Math.max(
      0,
      coresList.findIndex((c) => c.produto_cor_id === corSelecionadaObj?.produto_cor_id),
    );
    const ordered = [
      ...coresList.slice(selectedIndex),
      ...coresList.slice(0, selectedIndex),
    ];
    const urls: string[] = [];
    ordered.forEach((c) => {
      if (c.imagens.length > 0) {
        c.imagens.forEach((img) => urls.push(img.url_full));
      } else if (c.imagem_full) {
        urls.push(c.imagem_full);
      } else if (c.imagem_thumb) {
        urls.push(c.imagem_thumb);
      }
    });
    // Imediato: principal da cor atual + principal da próxima cor.
    const immediate = Math.min(2, urls.length);
    preloadImagesPrioritized(urls, immediate);
  }, [coresList, corSelecionadaObj?.produto_cor_id]);

  // Preload sob demanda de uma cor + até 2 vizinhas (próximas na ordem).
  // Usado no hover (desktop) e ao selecionar uma cor (mobile) para que a
  // próxima troca pareça instantânea. Respeita o cache global — nunca
  // duplica request.
  // Throttle por cor: evita disparar preloads repetidos quando o usuário
  // passa o mouse rapidamente sobre várias cores (ou re-hovera a mesma).
  const lastPreloadAtRef = useRef<Map<string, number>>(new Map());
  const PRELOAD_THROTTLE_MS = 500;

  const preloadColorNeighbors = useCallback(
    (produtoCorId: string) => {
      if (coresList.length === 0) return;
      const idx = coresList.findIndex((c) => c.produto_cor_id === produtoCorId);
      if (idx < 0) return;
      const now = Date.now();
      const last = lastPreloadAtRef.current.get(produtoCorId) ?? 0;
      if (now - last < PRELOAD_THROTTLE_MS) return;
      lastPreloadAtRef.current.set(produtoCorId, now);
      const targets = [
        coresList[idx],
        coresList[(idx + 1) % coresList.length],
        coresList[(idx + 2) % coresList.length],
      ];
      // Heurística leve para "imagem do mesmo tamanho": se a URL contiver
      // um token reconhecível do tamanho atualmente selecionado (ex.: "_M",
      // "-G", "/PP/"), priorizamos essa imagem. Caso contrário, cai para a
      // primeira imagem da cor (comportamento anterior).
      const sizeToken = (tamanhoSelecionado || "").trim().toUpperCase();
      const matchesSize = (url: string) => {
        if (!sizeToken) return false;
        const u = url.toUpperCase();
        const pattern = new RegExp(`(^|[^A-Z0-9])${sizeToken}([^A-Z0-9]|$)`);
        return pattern.test(u);
      };
      const urls: string[] = [];
      const seen = new Set<string>();
      targets.forEach((c) => {
        if (!c || seen.has(c.produto_cor_id)) return;
        seen.add(c.produto_cor_id);
        const galeria = c.imagens.map((img) => img.url_full).filter(Boolean);
        const preferida = galeria.find(matchesSize);
        const principal =
          preferida || galeria[0] || c.imagem_full || c.imagem_thumb || "";
        if (principal) urls.push(principal);
      });
      // Limite duro: máximo 2 imagens por interação.
      preloadImagesPrioritized(urls.slice(0, 2), 2);
    },
    [coresList, tamanhoSelecionado],
  );

  // Ao trocar cor, salta para a primeira imagem dessa cor na galeria unificada.
  useEffect(() => {
    if (!corSelecionadaObj) return;
    const idx = primeiraImagemPorCor[corSelecionadaObj.cor];
    if (typeof idx === "number" && idx !== imagemSelecionadaIndex) {
      setImagemSelecionadaIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corSelecionadaObj?.produto_cor_id, primeiraImagemPorCor]);

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

  // Persiste cor/tamanho na URL (sem recarregar) para permitir share da seleção
  // exata, e simultaneamente em localStorage para restaurar a seleção quando
  // o usuário voltar ao produto via link direto sem query string.
  // Lê `location` via window dentro do effect para NÃO reagir à própria
  // mudança de query string que ele dispara — isso evita um loop sutil que
  // re-disparava effects dependentes (SEO, redirect) e dava sensação de
  // "reload" ao trocar cor/tamanho.
  useEffect(() => {
    if (!produto) return;
    const pid = produto.produtoId || produto.id;
    // 1) URL — apenas se mudou (replaceState direto, sem invocar router).
    const currentSearch = window.location.search;
    const currentPath = window.location.pathname;
    const params = new URLSearchParams(currentSearch);
    if (corSelecionada) params.set("cor", corSelecionada);
    else params.delete("cor");
    if (tamanhoSelecionado) params.set("tamanho", tamanhoSelecionado);
    else params.delete("tamanho");
    const next = params.toString();
    const target = `${currentPath}${next ? `?${next}` : ""}`;
    if (target !== `${currentPath}${currentSearch}`) {
      // window.history.replaceState evita disparar listeners do react-router
      // e, portanto, não causa nenhuma re-execução de effects que dependam
      // de `location.search` em outros componentes.
      window.history.replaceState(null, "", target);
    }
    // 2) localStorage — sobrevive a reload/recarga sem query string.
    try {
      const payload = JSON.stringify({
        cor: corSelecionada || null,
        tamanho: tamanhoSelecionado || null,
        imagemIndex: imagemSelecionadaIndex,
        ts: Date.now(),
      });
      window.localStorage.setItem(storageKeyForProduct(pid), payload);
    } catch {
      /* storage indisponível — ignora silenciosamente */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corSelecionada, tamanhoSelecionado, imagemSelecionadaIndex, produto?.id]);

  // Restaura seleção persistida no localStorage quando NÃO há `?cor=` na URL.
  // Roda 1x por produto. A URL sempre tem prioridade sobre o storage.
  const restoredFromStorageRef = useRef<string | null>(null);
  useEffect(() => {
    if (!produto) return;
    const pid = String(produto.produtoId || produto.id);
    if (restoredFromStorageRef.current === pid) return;
    if (coresList.length === 0) return;
    restoredFromStorageRef.current = pid;

    // Se a URL já trouxe cor, ela vence.
    const corNaUrl = new URLSearchParams(window.location.search).get("cor");
    if (corNaUrl) return;

    try {
      const raw = window.localStorage.getItem(storageKeyForProduct(pid));
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        cor?: string | null;
        tamanho?: string | null;
        imagemIndex?: number;
      };
      if (saved.cor) {
        const corItem = coresList.find((c) => c.cor.toLowerCase() === saved.cor!.toLowerCase());
        if (corItem) {
          setCorSelecionada(corItem.cor);
          setCorSelecionadaId(corItem.produto_cor_id);
          if (saved.tamanho && corItem.tamanhos.includes(saved.tamanho)) {
            setTamanhoSelecionado(saved.tamanho);
          }
        }
      }
    } catch {
      /* JSON inválido ou storage indisponível — ignora */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto?.id, coresList]);

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

  // Sync bidirecional: ao selecionar imagem (setas, thumbnails, swipe),
  // se essa imagem pertence a uma cor conhecida, atualiza a cor selecionada
  // — mesma regra usada no ProductCard. Reconcilia o tamanho se necessário.
  const handleImageSelect = useCallback(
    (index: number) => {
      setImagemSelecionadaIndex(index);
      const entry = galeriaUnificada[index];
      if (!entry?.cor) return;
      if (entry.cor === corSelecionada) return;
      const corItem = coresList.find((c) => c.cor === entry.cor);
      if (!corItem) return;
      setCorSelecionada(corItem.cor);
      setCorSelecionadaId(corItem.produto_cor_id);
      // Reconcilia tamanho com a nova cor (preserva se válido; senão limpa
      // ou auto-seleciona quando há um único tamanho).
      const tamanhosDaCor = corItem.tamanhos;
      if (tamanhoSelecionado && tamanhosDaCor.includes(tamanhoSelecionado)) {
        // mantém
      } else if (tamanhosDaCor.length === 1) {
        setTamanhoSelecionado(tamanhosDaCor[0]);
      } else {
        setTamanhoSelecionado("");
      }
    },
    [galeriaUnificada, coresList, corSelecionada, tamanhoSelecionado],
  );

  // SEO/JSON-LD: só recalcula quando muda produto, cor ou tamanho REAIS
  // (chaves primitivas) — não a cada render por causa de arrays/objetos
  // recriados. Isso evita reescrever <title>, meta tags e <script type="ld+json">
  // a cada interação, o que causava trabalho desnecessário no document head.
  const seoProdutoId = String(produto?.produtoId || produto?.id || "");
  const seoImagemPrincipal = useMemo(() => {
    if (!produto) return "";
    return (
      imagensParaMostrar[0] ||
      corSelecionadaObj?.imagem_full ||
      corSelecionadaObj?.imagem_thumb ||
      produto.imagens[0] ||
      ""
    );
  }, [produto, imagensParaMostrar, corSelecionadaObj]);

  useEffect(() => {
    if (!produto) return;
    let cancelled = false;
    vitrineApiService.getConfig().then((config) => {
      if (cancelled) return;
      const preco = getDisplayPrice(produto);
      const precoFormatadoSeo = formatBRL(preco);
      const promoSeo = getPromoInfo(produto);
      const colecaoTexto = produto.colecao ? ` da coleção ${produto.colecao}` : "";
      const imagemPrincipal = seoImagemPrincipal || produto.imagens[0];

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
    return () => { cancelled = true; };
    // Deps estáveis: re-roda apenas quando produto/cor/tamanho mudam de valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seoProdutoId, corSelecionada, tamanhoSelecionado, seoImagemPrincipal]);

  // LoadingOverlay APENAS no carregamento inicial bruto — quando não há nenhum
  // dado em memória (nem da lista, nem do detalhe). Quando o detalhe está
  // sendo refrescado em background mas já temos dados exibíveis, NUNCA
  // bloqueamos a página: a UI permanece responsiva e o loading de imagens é
  // delegado ao <ProductImageSkeleton> (mídia local, não bloqueia layout).
  const hasAnyData = !!(produtoDetalhe || produtoFromList);
  if ((loading || loadingDetalhe) && !hasAnyData) {
    // Skeleton estrutural — preserva o layout (header/grid) e mostra
    // placeholders apenas onde os dados/mídia ainda vão chegar.
    // Não bloqueia a UI nem sobrepõe a página.
    return <ProductDetailSkeleton />;
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
                productName={
                  corSelecionada
                    ? `${produto.nome} — cor ${corSelecionada}`
                    : produto.nome
                }
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
                            onMouseEnter={() => preloadColorNeighbors(corItem.produto_cor_id)}
                            onPointerEnter={() => preloadColorNeighbors(corItem.produto_cor_id)}
                            onFocus={() => preloadColorNeighbors(corItem.produto_cor_id)}
                            onClick={() => {
                              setCorSelecionada(cor);
                              setCorSelecionadaId(corItem.produto_cor_id);
                              // Mobile/desktop: ao escolher, antecipa as próximas
                              // 1–2 cores prováveis para tornar a próxima troca instantânea.
                              preloadColorNeighbors(corItem.produto_cor_id);
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
                      ref={sizeGuide.sectionRef as React.RefObject<HTMLDivElement>}
                      tabIndex={-1}
                      className="space-y-3 animate-fade-in scroll-mt-24 rounded-lg transition-all duration-300"
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
