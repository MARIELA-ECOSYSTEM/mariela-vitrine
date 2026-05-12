import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductMedia } from "./ProductMedia";
import { getProductVideoByColor } from "@/lib/productImage";
import type { Produto } from "@/data/products";

describe("Mídia Híbrida (Hybrid Media)", () => {
  const mockProduto: Produto = {
    id: 1,
    codigoProduto: "P1",
    nome: "Vestido Teste",
    descricao: "Desc",
    categoria: "vestidos",
    imagens: ["img1.jpg"],
    variants: [],
    precoCusto: 50,
    precoVenda: 100,
    emPromocao: false,
    isNovidade: true,
    video_card_url: "video.mp4",
    poster_url: "poster.jpg",
    cores: [
      {
        produto_cor_id: "c1",
        cor: "Preto",
        imagem_thumb: "p_thumb.jpg",
        imagem_full: "p_full.jpg",
        tamanhos: [],
        video_card_url: "video_preto.mp4",
        poster_url: "poster_preto.jpg"
      }
    ]
  };

  it("deve resolver corretamente o vídeo da cor", () => {
    const res = getProductVideoByColor(mockProduto, "Preto");
    expect(res?.url).toBe("video_preto.mp4");
    expect(res?.poster).toBe("poster_preto.jpg");
  });

  it("deve usar o vídeo do produto se a cor não tiver vídeo específico", () => {
    const res = getProductVideoByColor(mockProduto, "Branco");
    expect(res?.url).toBe("video.mp4");
    expect(res?.poster).toBe("poster.jpg");
  });

  it("deve renderizar poster inicialmente quando não está tocando", () => {
    render(
      <ProductMedia 
        type="video" 
        url="video.mp4" 
        posterUrl="poster.jpg" 
        alt="Teste" 
      />
    );
    
    const poster = screen.getByAltText("Teste");
    expect(poster).toBeDefined();
    expect(poster.getAttribute("src")).toBe("poster.jpg");
  });

  it("não deve quebrar ao renderizar vídeo sem poster", () => {
    render(
      <ProductMedia 
        type="video" 
        url="video.mp4" 
        alt="Teste" 
      />
    );
    const video = screen.getByLabelText("Teste");
    expect(video).toBeDefined();
  });
});