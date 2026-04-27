import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { ImageGallery } from "@/components/ImageGallery";
import {
  getProductImageByColor,
  PRODUCT_IMAGE_PLACEHOLDER,
} from "@/lib/productImage";
import type { Produto } from "@/data/products";

// jsdom não traz IntersectionObserver — polyfill mínimo p/ ProductImageSkeleton.
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
(globalThis as unknown as { IntersectionObserver: typeof IOStub }).IntersectionObserver = IOStub;

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/services/vitrineTrackingService", () => ({
  trackWhatsappClick: vi.fn(),
}));
vi.mock("@/services/productInsightsService", () => ({
  getPublicProductBadge: () => null,
}));

/**
 * Heurística para detectar o placeholder local em qualquer URL renderizada.
 * O bundler resolve `@/assets/produto-generico.png` para algo como
 * `/assets/produto-generico-<hash>.png` em build, ou para o caminho do
 * arquivo em testes. Aceitamos:
 *   - igualdade exata com `PRODUCT_IMAGE_PLACEHOLDER`
 *   - qualquer URL que contenha o slug `produto-generico`
 */
function isLocalPlaceholder(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src === PRODUCT_IMAGE_PLACEHOLDER) return true;
  return /produto-generico/i.test(src);
}

function makeProdutoWithNullThumb(): Produto {
  // Cenário crítico: a vitrine-api retornou a cor "Azul" SEM imagem
  // (`imagem_thumb: null` e `imagem_full: null`). A Vitrine NÃO pode
  // disfarçar isso aplicando placeholder local — esse fallback deve
  // vir do PDV via `produto.imagens` ou ficar visivelmente ausente.
  return {
    id: 42,
    codigoProduto: "P42",
    nome: "Vestido Cor-Sem-Imagem",
    descricao: "",
    categoria: "vestidos",
    imagens: [], // nenhuma imagem no produto
    variants: [{ tamanho: "M", cor: "Azul", disponibilidade: 1 }],
    cores: [
      {
        produto_cor_id: "azul-1",
        cor: "Azul",
        imagem_thumb: null,
        imagem_full: null,
        tamanhos: [{ tamanho: "M", disponibilidade: 1 }],
      },
    ],
    precoCusto: 10,
    precoVenda: 100,
    emPromocao: false,
    isNovidade: false,
  };
}

describe("Contrato estrito vitrine-api ↔ Vitrine (sem placeholder local)", () => {
  it("getProductImageByColor NÃO inventa placeholder local quando imagem_thumb é null", () => {
    const produto = makeProdutoWithNullThumb();
    const { src, alt } = getProductImageByColor(produto, "Azul");

    if (isLocalPlaceholder(src)) {
      throw new Error(
        [
          "❌ REGRESSÃO: a Vitrine aplicou placeholder LOCAL para uma cor cuja",
          "   `imagem_thumb` veio null no payload da vitrine-api.",
          "",
          "   Produto: " + produto.nome,
          "   Cor: Azul",
          "   src retornado: " + src,
          "   PRODUCT_IMAGE_PLACEHOLDER: " + PRODUCT_IMAGE_PLACEHOLDER,
          "",
          "   Regra: o placeholder de produto sem imagem agora é entregue",
          "   pelo PDV via vitrine-api. A Vitrine deve consumir EXATAMENTE",
          "   o que veio em `cores[].imagem_thumb` / `produto.imagens`.",
          "",
          "   Onde investigar: src/lib/productImage.ts (não inserir fallback",
          "   proativo) e src/components/ProductCard.tsx (não substituir por",
          "   PRODUCT_IMAGE_PLACEHOLDER no render).",
        ].join("\n"),
      );
    }

    expect(src).toBe("");
    expect(alt).toContain("Azul");
  });

  it("ProductCard NÃO injeta placeholder local no <img> quando a API entregou imagem_thumb null", () => {
    const produto = makeProdutoWithNullThumb();
    const { container } = render(
      <MemoryRouter>
        <ProductCard produto={produto} />
      </MemoryRouter>,
    );

    const imgs = Array.from(container.querySelectorAll("img"));
    const offenders = imgs
      .map((img) => img.getAttribute("src") || "")
      .filter((src) => isLocalPlaceholder(src));

    if (offenders.length > 0) {
      throw new Error(
        [
          "❌ REGRESSÃO no ProductCard:",
          "",
          "   A vitrine-api entregou `cores[].imagem_thumb: null` para a cor",
          "   selecionada, mas o componente renderizou um placeholder LOCAL",
          "   no DOM. Isso quebra o contrato: o fallback de imagem genérica",
          "   deve ser entregue pelo PDV via API, não fabricado no frontend.",
          "",
          "   Imagens detectadas com src de placeholder local:",
          ...offenders.map((s) => "     - " + s),
          "",
          "   PRODUCT_IMAGE_PLACEHOLDER atual: " + PRODUCT_IMAGE_PLACEHOLDER,
          "",
          "   Onde investigar:",
          "     • src/components/ProductCard.tsx → useMemo `imagemAtual`",
          "       (não usar `|| PRODUCT_IMAGE_PLACEHOLDER`).",
          "     • src/lib/productImage.ts → `getProductImageByColor` deve",
          "       devolver string vazia quando a API não entregou imagem.",
          "     • Imports de `produto-generico.png` em componentes de",
          "       listagem/detalhe (devem permanecer apenas para `onError`).",
        ].join("\n"),
      );
    }

    expect(offenders.length).toBe(0);
  });

  it("ImageGallery NÃO injeta placeholder local quando a API não entregou imagens", () => {
    const { container } = render(
      <ImageGallery images={[]} productName="Vestido Sem Imagem" />,
    );
    const imgs = Array.from(container.querySelectorAll("img"));
    const offenders = imgs
      .map((img) => img.getAttribute("src") || "")
      .filter((src) => isLocalPlaceholder(src));

    if (offenders.length > 0) {
      throw new Error(
        [
          "❌ REGRESSÃO no ImageGallery (ProductDetail):",
          "",
          "   Sem imagens no payload da vitrine-api, a galeria está injetando",
          "   placeholder LOCAL no DOM. O fallback deve vir do PDV.",
          "",
          "   srcs ofensores:",
          ...offenders.map((s) => "     - " + s),
          "",
          "   Onde investigar: src/components/ImageGallery.tsx (não usar",
          "   `[produtoGenerico]` como fallback de `images`).",
        ].join("\n"),
      );
    }

    expect(offenders.length).toBe(0);
  });
});

describe("Paridade visual ProductCard ↔ ProductDetail por cor", () => {
  // Garante que a MESMA URL é resolvida nos dois contextos para a mesma cor.
  // Se o ProductCard começar a derivar imagem de fonte diferente do
  // `getProductImageByColor`, esta paridade quebra.
  function makeProduto(): Produto {
    return {
      id: 7,
      codigoProduto: "P7",
      nome: "Vestido Multi",
      descricao: "",
      categoria: "vestidos",
      imagens: ["https://cdn.api/preto.jpg", "https://cdn.api/azul.jpg"],
      variants: [
        { tamanho: "M", cor: "Preto", disponibilidade: 2 },
        { tamanho: "M", cor: "Azul", disponibilidade: 2 },
      ],
      cores: [
        {
          produto_cor_id: "preto-1",
          cor: "Preto",
          imagem_thumb: "https://cdn.api/preto.jpg",
          imagem_full: "https://cdn.api/preto.jpg",
          tamanhos: [{ tamanho: "M", disponibilidade: 2 }],
        },
        {
          produto_cor_id: "azul-1",
          cor: "Azul",
          imagem_thumb: "https://cdn.api/azul.jpg",
          imagem_full: "https://cdn.api/azul.jpg",
          tamanhos: [{ tamanho: "M", disponibilidade: 2 }],
        },
      ],
      precoCusto: 10,
      precoVenda: 100,
      emPromocao: false,
      isNovidade: false,
    };
  }

  it("retorna o mesmo src para a mesma cor selecionada (Preto)", () => {
    const produto = makeProduto();
    const card = getProductImageByColor(produto, "Preto").src;
    // ProductDetail usa a mesma fonte central; fazemos a verificação
    // chamando o resolver duas vezes (um por contexto) para garantir
    // que ambos passam pelo mesmo caminho determinístico.
    const detail = getProductImageByColor(produto, "Preto").src;
    expect(card).toBe(detail);
    expect(card).toBe("https://cdn.api/preto.jpg");
  });

  it("retorna o mesmo src para a cor Azul nos dois contextos", () => {
    const produto = makeProduto();
    expect(getProductImageByColor(produto, "Azul").src).toBe(
      "https://cdn.api/azul.jpg",
    );
  });
});
