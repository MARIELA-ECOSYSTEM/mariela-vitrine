import { useEffect, useRef, useState } from "react";
import type { Produto, ProdutoCor } from "@/data/products";
import { vitrineApiService } from "@/services/vitrineApiService";

/**
 * Hook leve para enriquecer um produto com `cores` quando a listagem (`/produtos`)
 * não retorna o array de cores. Faz a busca do detalhe sob demanda apenas quando:
 *  - o produto ainda não tem `cores` reais
 *  - o elemento `targetRef` está perto da viewport (lazy via IntersectionObserver)
 *
 * O resultado é mesclado em memória (apenas `cores` e `imagens`), sem alterar o
 * produto original. O cache do `vitrineApiService.getProdutoById` deduplica
 * chamadas concorrentes para o mesmo produto.
 */
export function useProdutoCores(
  produto: Produto,
  targetRef: React.RefObject<HTMLElement>,
): { cores: ProdutoCor[] | undefined; imagens: string[] } {
  const hasCoresReais = Boolean(produto.cores && produto.cores.length > 0);
  const [cores, setCores] = useState<ProdutoCor[] | undefined>(produto.cores);
  const [imagens, setImagens] = useState<string[]>(produto.imagens);
  const fetchedRef = useRef(false);

  useEffect(() => {
    setCores(produto.cores);
    setImagens(produto.imagens);
    fetchedRef.current = hasCoresReais;
  }, [produto, hasCoresReais]);

  useEffect(() => {
    if (hasCoresReais || fetchedRef.current) return;
    const node = targetRef.current;
    if (!node) return;

    let cancelled = false;
    const start = () => {
      if (cancelled || fetchedRef.current) return;
      fetchedRef.current = true;
      const id = produto.produtoId || produto.codigoProduto || String(produto.id);
      vitrineApiService
        .getProdutoById(id)
        .then((detalhe) => {
          if (cancelled || !detalhe) return;
          if (detalhe.cores && detalhe.cores.length > 0) setCores(detalhe.cores);
          if (detalhe.imagens && detalhe.imagens.length > 0) setImagens(detalhe.imagens);
        })
        .catch(() => {
          // Falha silenciosa — mantém o produto original
          fetchedRef.current = false;
        });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            start();
            observer.disconnect();
          }
        });
      },
      { rootMargin: "300px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [hasCoresReais, produto.id, produto.produtoId, produto.codigoProduto, targetRef]);

  return { cores, imagens };
}