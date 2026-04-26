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

---

## Espaçamento de páginas — `PageContainer`

Use `<PageContainer>` (`src/components/PageContainer.tsx`) como wrapper
padrão do conteúdo de toda página interna. Ele aplica:

- `container mx-auto`
- `padX` default: `px-3 sm:px-4 md:px-6`
- `padY` default: `py-6 md:py-12`

### Regras

1. Todas as páginas internas (Products, Cart, MonteSeuLook, etc.) devem
   usar `<PageContainer>` em vez de `<div className="container mx-auto …">`.
2. O offset do header fixo (`pt-[60px] sm:pt-[68px]`) pertence ao layout
   externo da página, **não** ao `PageContainer`. Não duplique.
3. `padX` e `padY` são independentes — sobrescreva apenas o que precisar.

### Exceções autorizadas

| Página | Motivo | Padrão |
|---|---|---|
| `Index` (Home) | Header transparente em overlay sobre o banner. Hero deve sangrar até o topo. | **Não usa** `PageContainer`. Layout sem `pt-[60px]`. |
| `ProductDetail` | Galeria + grid `lg:grid-cols-2` com espaçamento próprio; `<main>` já define `pb-8 md:pb-16`. | `padY="pt-0 pb-0"` (ou continua com `<div className="container …">` próprio). |
| `Instalar` | Hero com gradiente decorativo de largura total + `max-w-2xl` interno. | Wrapper próprio dentro de `<section>`. |

### Checklist ao criar nova página

- [ ] Usa `<PageContainer>` no conteúdo principal.
- [ ] Layout externo aplica `pt-[60px] sm:pt-[68px]` (exceto Home).
- [ ] Não há `container mx-auto` manual com `py-*` redundante.
- [ ] Breadcrumbs e cards alinham ao mesmo grid (mesmo `padX` que o restante do conteúdo).
