# Guia de desenvolvimento — Vitrine Mariela

Documentação interna com regras que **não devem ser quebradas** ao evoluir o frontend
da vitrine. Foco em evitar regressões silenciosas no consumo da API pública.

---

## Contrato de cores nos cards (Home e `/products`)

Os cards de produto exibidos na Home e na página `/products` seguem um contrato
estrito para garantir performance (sem N+1) e consistência visual.

### Regras definitivas

1. **Fonte única de dados**: Home e `/products` usam **somente** `/vitrine-api/produtos`.
2. **Sem N+1**: cards **nunca** devem chamar `/vitrine-api/produto/{id}`.
   - Nada de "lazy fetch", "enrichment", `IntersectionObserver` para buscar detalhe,
     hooks tipo `useProdutoCores` ou similares.
3. **Swatches/cores nos cards**: `produto.cores` vindo da listagem é a fonte única.
   - Não derivar cores de `variants` quando `produto.cores` existir.
   - Não buscar `imagem_full`/`imagem_thumb` do detalhe — usar somente o que vier
     no item da listagem.
4. **Fallback "Única"**: o rótulo `Única` só pode aparecer quando
   `produto.cores` estiver **ausente** ou **vazio** (`length === 0`).
   Nunca exibir "Única" se houver pelo menos uma cor real.
5. **Página de detalhe é a única que pode chamar `/vitrine-api/produto/{id}`**.
   Esse endpoint traz a grade real de tamanhos por cor e a galeria completa.
6. **Não filtrar cores por tamanhos no card**.
   A listagem pode não enviar `tamanhos` por cor (apenas `disponivel`). Filtrar
   por tamanhos remove cores reais da UI.
7. **Disponibilidade da cor** vem direto da API em `cor.disponivel`.
   Não inferir disponibilidade somando estoque de variantes no card.

### Cache e ETag

- `vitrineApiService` mantém cache em memória + `localStorage` segmentado por
  URL (path + querystring ordenada).
- Cada entrada armazena o `ETag` retornado pela API. Requisições subsequentes
  enviam `If-None-Match`; em `304 Not Modified` o payload em cache é reutilizado
  e o timestamp renovado.
- Quando o servidor publica um novo `ETag`, a entrada é sobrescrita
  automaticamente — payloads antigos **sem `cores`** deixam de ser servidos.
- Bump de versão da chave de cache (`mariela_vitrine_api_cache_v{N}`) força
  invalidação total quando o contrato muda de forma incompatível.

### Logs em desenvolvimento

- Quando `produto.cores` vier ausente/vazio na listagem, `ProductCard` emite
  `console.debug` apenas em `import.meta.env.DEV`.
- Em produção, nenhum erro é exibido ao usuário. O fallback "Única" mantém
  o card funcional.

---

## Checklist de regressão

Antes de mergear qualquer mudança que toque cards, listagem ou serviço da
vitrine, validar no DevTools (aba Network):

- [ ] Abrir `/` (Home) → **nenhuma** requisição para `/vitrine-api/produto/{id}`.
- [ ] Abrir `/products` → **nenhuma** requisição para `/vitrine-api/produto/{id}`.
- [ ] Abrir `/products/{slug}` → **uma** requisição para `/vitrine-api/produto/{id}`
      (página de detalhe é a única autorizada).
- [ ] Cards exibem cores reais (ex.: "Verde", "Vermelho") quando a listagem
      retorna `cores`.
- [ ] Rótulo "Única" só aparece em produtos cujo payload da listagem **não**
      traz `cores` (ou traz array vazio).
- [ ] Sem regressão visual nos layouts `grade` e `lista`.
- [ ] `bunx tsc --noEmit` passa sem erros.

---

## Onde olhar no código

- `src/components/ProductCard.tsx` — regra de exibição de cores e fallback "Única".
- `src/services/vitrineApiService.ts` — fetch, cache, ETag, mapeamento de
  `cores` e `variants`.
- `src/data/products.ts` — tipos `Produto`, `ProdutoCor`, `VarianteProduto`.
- `src/lib/productCache.ts` — cache local da listagem completa de produtos.
