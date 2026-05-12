 import { memo, useEffect, useState, useMemo } from "react";
 import { FeaturedProducts } from "./FeaturedProducts";
 import { FeaturedCollections } from "./FeaturedCollections";
 import { BannerBlock, InstagramBlock } from "./HomeDynamicBlocks";
 import { vitrineApiService, HomeBlock } from "@/services/vitrineApiService";
 import { Produto } from "@/data/products";
 import { PackageOpen, AlertCircle } from "lucide-react";
 
 interface BlockRendererProps {
   block: HomeBlock;
   debug?: boolean;
   manualProducts?: Record<string, Produto[]>;
 }
 
 const BlockRenderer = memo(({ block, debug, manualProducts }: BlockRendererProps) => {
   // Validade temporal controlada pelo PDV
   const now = useMemo(() => new Date(), []);
   if (block.validade) {
     if (block.validade.inicio && new Date(block.validade.inicio) > now) return null;
     if (block.validade.fim && new Date(block.validade.fim) < now) return null;
   }
 
   const blockManualProducts = manualProducts?.[block.id];
 
   const renderContent = () => {
     switch (block.tipo) {
       case "produtos": {
         const hasManualList = block.config?.produtos && block.config.produtos.length > 0;
         // Se for lista manual e ainda não temos os produtos, não renderiza (espera o fetch principal)
         if (hasManualList && !blockManualProducts) return null;
 
         return (
           <FeaturedProducts
             title={block.titulo || ""}
             subtitle={block.subtitulo || undefined}
             filter={(block.config?.filter as any) || "destaque"}
             limit={block.config?.limit || 4}
             linkTo={block.config?.linkTo || "/products"}
             linkLabel={block.config?.linkLabel || "Ver tudo"}
             products={blockManualProducts}
             layoutMode={block.config?.estilo === "lista" ? "lista" : "grade"}
           />
         );
       }
       case "colecoes":
         return <FeaturedCollections />;
       case "banner":
         if (!block.config?.mediaUrl) {
           if (debug) return <DebugOmission block={block} reason="Falta mediaUrl" />;
           return null;
         }
         return (
           <BannerBlock
             titulo={block.titulo}
             subtitulo={block.subtitulo}
             mediaUrl={block.config.mediaUrl}
             mediaType={block.config.mediaType}
             ctaLabel={block.config.ctaLabel}
             ctaUrl={block.config.ctaUrl}
           />
         );
       case "instagram":
         if (!block.config?.posts || block.config.posts.length === 0) {
           if (debug) return <DebugOmission block={block} reason="Falta posts" />;
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
         if (debug) return <DebugOmission block={block} reason="Tipo desconhecido" />;
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
 
 const DebugOmission = ({ block, reason }: { block: HomeBlock, reason: string }) => (
   <div className="p-4 border-2 border-dashed border-yellow-400 bg-yellow-50 text-yellow-700 text-xs font-mono rounded-lg my-4">
     <div className="flex items-center gap-2 mb-1">
       <AlertCircle className="w-4 h-4" />
       <strong>Bloco Omitido ({block.tipo}):</strong> {block.id}
     </div>
     <div>Motivo: {reason}</div>
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
     if (manualBlocks.length === 0) return;
 
     manualBlocks.forEach(async (block) => {
       if (manualProducts[block.id]) return; // Já carregado
       const ids = block.config?.produtos || [];
       const items = await vitrineApiService.getProdutosByIds(ids);
       setManualProducts(prev => ({ ...prev, [block.id]: items }));
     });
   }, [blocks]);
 
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
       {blocks.map((block) => (
         <BlockRenderer 
           key={block.id} 
           block={block} 
           debug={debug} 
           manualProducts={manualProducts}
         />
       ))}
     </div>
   );
 });
 
 DynamicHomeRenderer.displayName = "DynamicHomeRenderer";