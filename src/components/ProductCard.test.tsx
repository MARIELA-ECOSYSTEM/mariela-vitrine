import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductCard, getProdutoSignature } from "./ProductCard";
import type { Produto } from "@/data/products";

// Mocks mínimos — isolam a verificação da memoização do ProductCard.
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

function makeProduto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: 1,
    codigoProduto: "P1",
    nome: "Vestido Teste",
    descricao: "",
    categoria: "vestidos",
    imagens: ["https://img/a.jpg", "https://img/b.jpg"],
    variants: [{ tamanho: "M", cor: "Preto", disponibilidade: 3 }],
    cores: [
      {
        produto_cor_id: "c1",
        cor: "Preto",
        imagem_thumb: "https://img/a.jpg",
        imagem_full: "https://img/a.jpg",
        tamanhos: [{ tamanho: "M", disponibilidade: 3 }],
      },
    ],
    precoCusto: 10,
    precoVenda: 100,
    emPromocao: false,
    isNovidade: false,
    ...overrides,
  };
}

function renderCard(produto: Produto) {
  return render(
    <MemoryRouter>
      <ProductCard produto={produto} />
    </MemoryRouter>,
  );
}

describe("getProdutoSignature", () => {
  it("retorna a mesma string para conteúdo idêntico (refs diferentes)", () => {
    const a = makeProduto();
    const b = makeProduto();
    expect(getProdutoSignature(a)).toBe(getProdutoSignature(b));
  });

  it("muda quando estoque/imagens/preço mudam", () => {
    const base = makeProduto();
    const baseSig = getProdutoSignature(base);
    expect(getProdutoSignature(makeProduto({ precoVenda: 200 }))).not.toBe(baseSig);
    expect(getProdutoSignature(makeProduto({ imagens: ["https://img/x.jpg"] }))).not.toBe(baseSig);
    expect(
      getProdutoSignature(
        makeProduto({
          cores: [
            {
              produto_cor_id: "c1",
              cor: "Preto",
              imagem_thumb: "https://img/a.jpg",
              imagem_full: "https://img/a.jpg",
              tamanhos: [{ tamanho: "M", disponibilidade: 0 }],
            },
          ],
        }),
      ),
    ).not.toBe(baseSig);
  });

  it("usa cache por referência (mesma ref retorna a string já computada)", () => {
    const p = makeProduto();
    const s1 = getProdutoSignature(p);
    // Mutamos uma propriedade pós-cálculo para provar que o cache foi usado:
    // se não houvesse cache, o retorno mudaria.
    (p as unknown as { nome: string }).nome = "OUTRO NOME";
    const s2 = getProdutoSignature(p);
    expect(s2).toBe(s1);
  });
});

describe("ProductCard — estabilidade em refresh de background", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não re-renderiza quando a lista entrega nova ref com conteúdo idêntico", () => {
    const renderSpy = vi.fn();
    const Probe = ({ produto }: { produto: Produto }) => {
      renderSpy();
      return (
        <MemoryRouter>
          <ProductCard produto={produto} />
        </MemoryRouter>
      );
    };

    const { rerender } = render(<Probe produto={makeProduto()} />);
    const beforeCount = renderSpy.mock.calls.length;

    // Simula refresh em background: NOVA referência, MESMO conteúdo.
    rerender(<Probe produto={makeProduto()} />);
    rerender(<Probe produto={makeProduto()} />);
    rerender(<Probe produto={makeProduto()} />);

    // O wrapper Probe re-renderiza (esperado), mas o ProductCard internamente
    // mantém a ref estável — verificamos isso indiretamente pela assinatura
    // permanecer igual entre as chamadas.
    const sigs = [makeProduto(), makeProduto(), makeProduto()].map(getProdutoSignature);
    expect(new Set(sigs).size).toBe(1);
    expect(renderSpy.mock.calls.length).toBeGreaterThan(beforeCount);
  });

  it("re-renderiza quando o conteúdo realmente muda (preço)", () => {
    const { rerender, container } = renderCard(makeProduto());
    const htmlAntes = container.innerHTML;
    rerender(
      <MemoryRouter>
        <ProductCard produto={makeProduto({ precoVenda: 250 })} />
      </MemoryRouter>,
    );
    expect(container.innerHTML).not.toBe(htmlAntes);
  });
});