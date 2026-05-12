 import { memo, useEffect, useState, useMemo } from "react";
 import { FeaturedProducts } from "./FeaturedProducts";
 import { FeaturedCollections } from "./FeaturedCollections";
 import { BannerBlock, InstagramBlock } from "./HomeDynamicBlocks";
 import { vitrineApiService, HomeBlock } from "@/services/vitrineApiService";
 import { Produto } from "@/data/products";
 import { PackageOpen, AlertCircle, BarChart3, ShieldCheck, Zap } from "lucide-react";
 import { getMediaPerformanceReport, validateHeadPreloads } from "@/lib/mediaUtils";
 
 interface BlockRendererProps {
   block: HomeBlock;
   debug?: boolean;
   manualProducts?: Record<string, Produto[]>;
   index: number;
   isAboveFold?: boolean;
 }
 
 const BlockRenderer = memo(({ block, debug, manualProducts, index, isAboveFold = false }: BlockRendererProps) => {
   // Validade temporal controlada pelo PDV
   const now = useMemo(() => new Date(), []);
   if (block.validade) {
     if (block.validade.inicio && new Date(block.validade.inicio) > now) return null;
     if (block.validade.fim && new Date(block.validade.fim) < now) return null;
   }
 
   const blockManualProducts = manualProducts?.[block.id];
 
   const renderContent = () => {
      const isDebug = debug && import.meta.env.DEV;
      
      switch (block.tipo) {
        case "produtos": {
          const hasManualList = block.config?.produtos && block.config.produtos.length > 0;
          if (hasManualList && !blockManualProducts) return null;
  
          const blockLimit = block.config?.limit || block.config?.max_items || 4;
          const blockLayout = block.config?.estilo || "grade";
  
          return (
            <FeaturedProducts
              title={block.titulo || ""}
              subtitle={block.subtitulo || undefined}
              filter={(block.config?.filter as any) || "destaque"}
              limit={blockLimit}
              linkTo={block.config?.linkTo || "/products"}
              linkLabel={block.config?.linkLabel || "Ver tudo"}
              products={blockManualProducts}
              layoutMode={blockLayout as any}
              debug={isDebug}
            />
          );
        }
        case "colecoes":
          return <FeaturedCollections debug={isDebug} />;
        case "banner":
          if (!block.config?.mediaUrl) {
            if (isDebug) return <DebugOmission block={block} reason="Mídia ausente (mediaUrl)" details={block.config} />;
            return null;
          }
          return (
            <BannerBlock
              titulo={block.titulo}
              subtitulo={block.subtitulo}
              mediaUrl={block.config.mediaUrl}
              mediaType={block.config.mediaType}
              posterUrl={block.config.posterUrl}
              ctaLabel={block.config.ctaLabel}
              ctaUrl={block.config.ctaUrl}
              priority={isAboveFold}
            />
          );
        case "instagram":
          if (!block.config?.posts || block.config.posts.length === 0) {
            if (isDebug) return <DebugOmission block={block} reason="Posts do instagram ausentes" details={block.config} />;
            return null;
          }
          return (
            <InstagramBlock
              titulo={block.titulo}
              subtitulo={block.subtitulo}
              posts={block.config.posts}
            />
          );
        default:
          if (isDebug) return <DebugOmission block={block} reason="Tipo de bloco desconhecido" />;
          return null;
      }
   };
 
   const content = renderContent();
   if (!content) return null;
 
   return (
     <div className="relative group/block">
       {debug && (
         <div className="bg-yellow-100/90 text-yellow-800 text-[10px] px-2 py-1 absolute top-0 left-0 z-50 font-mono border border-yellow-200 rounded-br shadow-sm pointer-events-none backdrop-blur-sm opacity-0 group-hover/block:opacity-100 transition-opacity">
           [DEBUG] ID: {block.id} | Tipo: {block.tipo} | Ordem: {block.prioridade} | Estilo: {block.config?.estilo || 'default'}
         </div>
       )}
       {content}
     </div>
   );
 });
 
  const DebugOmission = ({ block, reason, details }: { block: HomeBlock, reason: string, details?: any }) => (
    <div className="p-4 border-2 border-dashed border-yellow-400 bg-yellow-50 text-yellow-700 text-xs font-mono rounded-lg my-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <strong>Bloco Omitido ({block.tipo}):</strong> {block.id}
      </div>
      <div>Motivo: {reason}</div>
      {details && <pre className="mt-2 text-[10px] bg-yellow-100/50 p-2 rounded overflow-auto max-h-32">{JSON.stringify(details, null, 2)}</pre>}
    </div>
  );
 BlockRenderer.displayName = "BlockRenderer";
 
 interface DynamicHomeRendererProps {
   blocks: HomeBlock[];
   loading?: boolean;
   debug?: boolean;
 }
 
 export const DynamicHomeRenderer = memo(({ blocks, loading, debug }: DynamicHomeRendererProps) => {
   const [manualProducts, setManualProducts] = useState<Record<string, Produto[]>>({});
 
   // Busca produtos para blocos com listas manuais (evita N+1 agregando em lote)
   useEffect(() => {
     const manualBlocks = blocks.filter(b => b.tipo === "produtos" && b.config?.produtos && b.config.produtos.length > 0);
     
     manualBlocks.forEach(async (block) => {
       // Só busca se ainda não temos no estado manualProducts para evitar refetch desnecessário
       if (manualProducts[block.id]) return; 
       
       const ids = block.config?.produtos || [];
       try {
         const items = await vitrineApiService.getProdutosByIds(ids);
         // Memoização simples via estado para evitar refetch no mesmo ciclo de vida
         setManualProducts(prev => {
           if (prev[block.id]) return prev;
           return { ...prev, [block.id]: items };
         });
       } catch (err) {
         // Silencioso, vitrineApiService já loga em DEV se falhar
       }
     });
   }, [blocks, manualProducts]);
 
   const mediaReport = useMemo(() => debug ? getMediaPerformanceReport() : null, [debug, blocks, manualProducts]);
   const headIssues = useMemo(() => debug ? validateHeadPreloads() : [], [debug, blocks]);
 
   if (loading) {
     return (
       <div className="space-y-6 sm:space-y-10">
         {[1, 2, 3].map((i) => (
           <FeaturedProducts
             key={`loading-block-${i}`}
             title="Carregando..."
             filter="novidades"
             forceLoading
             linkTo="#"
             linkLabel="Carregando"
           />
         ))}
       </div>
     );
   }
 
   if (blocks.length === 0) {
     return null;
   }
 
    return (
      <div className="space-y-6 sm:space-y-10">
        {debug && mediaReport && (
          <section className="bg-slate-900 text-slate-100 p-6 rounded-xl font-mono text-[11px] shadow-2xl border border-slate-700 mx-4">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Relatório de Performance de Mídia</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-slate-400 mb-1 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Total Mídias</div>
                <div className="text-xl font-bold">{mediaReport.total}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-slate-400 mb-1 flex items-center gap-1.5"><Zap className="w-3 h-3 text-yellow-400" /> Prioridade High</div>
                <div className="text-xl font-bold text-yellow-400">{mediaReport.highPriority}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-slate-400 mb-1 flex items-center gap-1.5"><PackageOpen className="w-3 h-3 text-green-400" /> Preloaded</div>
                <div className="text-xl font-bold text-green-400">{mediaReport.preloaded}</div>
              </div>
            </div>
 
            {headIssues.length > 0 && (
              <div className="mb-6 bg-red-950/30 border border-red-900/50 p-3 rounded-lg">
                <div className="text-red-400 font-bold mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Inconsistências Detectadas:
                </div>
                <ul className="list-disc list-inside space-y-1 text-red-300">
                  {headIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                </ul>
              </div>
            )}
 
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {mediaReport.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50">
                  <div className="truncate flex-1 mr-4">
                    <span className="text-slate-500">...</span>{item.url}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${item.priority === 'high' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-300'}`}>
                      {item.priority}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${item.isAboveFold ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                      {item.isAboveFold ? 'fold' : 'lazy'}
                    </span>
                    {item.preloaded && (
                      <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[9px]">
                        preloaded
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {blocks.map((block, idx) => {
         // Detecção confiável de "acima da dobra" (LCP candidates):
         // - Se for o primeiro bloco da lista dinâmica
         // - E não estivermos em um estado de loading massivo que empurre o conteúdo
         // No Mariela, o HeroBannerCarousel já ocupa o topo, então o 1º bloco dinâmico 
         // pode ou não estar visível dependendo da altura da tela. Consideramos o 1º
         // bloco dinâmico como prioridade para garantir que o LCP não sofra.
         const isAboveFold = idx === 0;
         
         return (
           <BlockRenderer 
             key={block.id} 
             block={block} 
             debug={debug} 
             manualProducts={manualProducts}
             index={idx}
             isAboveFold={isAboveFold}
           />
         );
       })}
     </div>
   );
 });
 
 DynamicHomeRenderer.displayName = "DynamicHomeRenderer";