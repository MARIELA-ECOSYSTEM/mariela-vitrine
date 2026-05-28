import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetail from "./ProductDetail";
import { vitrineApiService } from "@/services/vitrineApiService";

// ============================================================
// Mocks de componentes pesados — isolam a UI de NotFound do
// resto do layout (Header/Footer/Gallery não afetam este teste).
// ============================================================
vi.mock("@/components/Header", () => ({ Header: () => <div data-testid="header" /> }));
vi.mock("@/components/Footer", () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock("@/components/Breadcrumbs", () => ({ Breadcrumbs: () => <nav data-testid="breadcrumbs" /> }));
vi.mock("@/components/ImageGallery", () => ({ ImageGallery: () => <div data-testid="gallery" /> }));
vi.mock("@/components/SizeGuide", () => ({ SizeGuide: () => <div data-testid="size-guide" /> }));
vi.mock("@/components/RelatedProducts", () => ({ RelatedProducts: () => <div data-testid="related" /> }));
vi.mock("@/components/ProductDetailSkeleton", () => ({
  ProductDetailSkeleton: () => <div data-testid="detail-skeleton" />,
}));
vi.mock("@/components/seo/SEOMeta", () => ({ SEOMeta: () => null }));
vi.mock("@/contexts/CartContext", () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const useProductsMock = vi.fn();
vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => useProductsMock(),
}));

vi.mock("@/services/vitrineApiService", async () => {
  const actual = await vi.importActual<typeof import("@/services/vitrineApiService")>(
    "@/services/vitrineApiService",
  );
  return {
    ...actual,
    vitrineApiService: {
      ...actual.vitrineApiService,
      getProdutoById: vi.fn(),
    },
  };
});

const renderAt = (path = "/products/teste") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>,
  );

const fakeProduto = {
  id: 1,
  produtoId: "abc",
  nome: "Produto Teste",
  descricao: "",
  precoVenda: 100,
  emPromocao: false,
  isNovidade: false,
  imagens: ["img.jpg"],
  variants: [{ disponibilidade: 1, tamanho: "P", cor: "Preto" }],
  cores: [],
  categoria: "vestidos",
  slug: "teste",
} as any;

describe("ProductDetail — UI de produto não encontrado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe mensagem elegante + botão Voltar quando NÃO existe produto na lista", async () => {
    useProductsMock.mockReturnValue({ produtos: [], loading: false });

    renderAt("/products/inexistente");

    await waitFor(() => {
      expect(screen.getByText(/Produto não encontrado/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Voltar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver todos os produtos/i })).toBeInTheDocument();
  });

  it("exibe a UI de não encontrado quando a API responde { data: null }, MESMO com fallback na lista", async () => {
    useProductsMock.mockReturnValue({ produtos: [fakeProduto], loading: false });
    (vitrineApiService.getProdutoById as any).mockResolvedValue(null);

    renderAt("/products/teste");

    await waitFor(() => {
      expect(screen.getByText(/Produto não encontrado/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Voltar/i })).toBeInTheDocument();
  });

  it("não depende do fallback silencioso: marca como não encontrado em erro de rede sem fallback", async () => {
    useProductsMock.mockReturnValue({ produtos: [], loading: false });
    (vitrineApiService.getProdutoById as any).mockRejectedValue(new Error("network"));

    renderAt("/products/inexistente");

    await waitFor(() => {
      expect(screen.getByText(/Produto não encontrado/i)).toBeInTheDocument();
    });
  });
});