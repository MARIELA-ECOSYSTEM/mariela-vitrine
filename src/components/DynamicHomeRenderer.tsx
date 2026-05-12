 import { memo, useEffect, useState, useMemo } from "react";
 import { FeaturedProducts } from "./FeaturedProducts";
 import { FeaturedCollections } from "./FeaturedCollections";
 import { vitrineApiService, HomeBlock } from "@/services/vitrineApiService";
 import { PackageOpen } from "lucide-react";
 
 interface DynamicHomeRendererProps {
   blocks: HomeBlock[];
   loading?: boolean;
   debug?: boolean;
 }
 
  export const DynamicHomeRenderer = memo(({ blocks, loading, debug }: DynamicHomeRendererProps) => {
   if (loading) {
     return (
       <>
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
       </>
     );
   }
 
   if (blocks.length === 0) {
     return null;
   }
 
   return (
     <div className="space-y-4">
       {blocks.map((block) => {
         try {
           // Validade temporal controlada pelo PDV
           if (block.validade) {
             const now = new Date();
             if (block.validade.inicio && new Date(block.validade.inicio) > now) return null;
             if (block.validade.fim && new Date(block.validade.fim) < now) return null;
           }
 
           return (
             <div key={block.id} className="relative">
               {debug && (
                 <div className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 absolute top-0 left-0 z-50 font-mono border border-yellow-200 rounded-br shadow-sm pointer-events-none">
                   [DEBUG] ID: {block.id} | Tipo: {block.tipo} | Prioridade: {block.prioridade}
                 </div>
               )}
               
               {block.tipo === "produtos" && (
                 <FeaturedProducts
                   title={block.titulo || ""}
                   subtitle={block.subtitulo || undefined}
                   filter={(block.config?.filter as any) || "destaque"}
                   limit={block.config?.limit || 4}
                   linkTo={block.config?.linkTo || "/products"}
                   linkLabel={block.config?.linkLabel || "Ver tudo"}
                   products={undefined} // Deixa o FeaturedProducts buscar ou passamos se a API trouxer os IDs
                 />
               )}
 
               {block.tipo === "colecoes" && (
                 <FeaturedCollections />
               )}
 
               {/* Adicionar outros tipos conforme evolução do Motor de Campanhas */}
             </div>
           );
         } catch (err) {
           if (import.meta.env.DEV) {
             console.error(`[DynamicHomeRenderer] Erro no bloco ${block.id}:`, err);
           }
           return null; // Omissão silenciosa em produção
         }
       })}
     </div>
   );
 });
 
 DynamicHomeRenderer.displayName = "DynamicHomeRenderer";