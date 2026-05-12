 import { useEffect, useState, useMemo } from "react";
 import { useParams, useLocation, Link } from "react-router-dom";
 import { Header } from "@/components/Header";
 import { Footer } from "@/components/Footer";
 import { PageContainer } from "@/components/PageContainer";
 import { ProductCard } from "@/components/ProductCard";
 import { ProductsLoadingSkeleton } from "@/components/ProductSkeleton";
 import { 
   vitrineApiService, 
   type ColecaoDestaque 
 } from "@/services/vitrineApiService";
 import type { Produto } from "@/data/products";
 import { updateSeo } from "@/lib/seo";
 import { ArrowLeft, Sparkles, ImageOff } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
 
 const CollectionDetail = () => {
   const { id } = useParams<{ id: string }>();
   const { search } = useLocation();
   const [colecao, setColecao] = useState<ColecaoDestaque | null>(null);
   const [produtos, setProdutos] = useState<Produto[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(false);
 
   useEffect(() => {
     if (!id) return;
 
     let active = true;
     setLoading(true);
     setError(false);
 
     const fetchData = async () => {
       try {
         // 1. Buscar a coleção específica
         const colecoes = await vitrineApiService.getColecoesDestaque();
         const match = colecoes.find((c) => c.id === id);
         
         if (!match) {
           if (active) setError(true);
           return;
         }
 
         if (active) setColecao(match);
 
         // 2. Buscar produtos desta coleção
         const productsPage = await vitrineApiService.getProdutosPage({
           colecao: match.nome,
           limit: 50
         });
 
         if (active) {
           setProdutos(productsPage.items);
           setLoading(false);
         }
 
         // 3. SEO
         updateSeo({
           title: `${match.nome} | Boutique Premium`,
           description: match.descricao || `Confira a coleção ${match.nome} em nossa boutique.`,
           image: match.banner_url || match.imagem_capa_url || undefined,
         });
       } catch (err) {
         console.error("[CollectionDetail] Error fetching data:", err);
         if (active) {
           setError(true);
           setLoading(false);
         }
       }
     };
 
     fetchData();
 
     return () => {
       active = false;
     };
   }, [id]);
 
   if (error) {
     return (
       <div className="min-h-screen flex flex-col">
         <Header />
         <main className="flex-grow flex items-center justify-center p-4">
           <div className="text-center">
             <h2 className="text-2xl font-serif mb-4">Coleção não encontrada</h2>
             <Button asChild variant="outline">
               <Link to="/">Voltar para a Home</Link>
             </Button>
           </div>
         </main>
         <Footer />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen flex flex-col bg-background">
       <Header />
       
       <main className="flex-grow">
         {/* Hero Section Premium */}
         <section className="relative w-full h-[60vh] min-h-[400px] overflow-hidden bg-muted">
           {loading ? (
             <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
           ) : colecao?.banner_url || colecao?.imagem_capa_url ? (
             <>
               <img 
                 src={colecao.banner_url || colecao.imagem_capa_url || ""} 
                 alt={colecao.nome}
                 className="absolute inset-0 w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
             </>
           ) : (
             <div className="absolute inset-0 flex items-center justify-center">
               <ImageOff className="w-12 h-12 text-muted-foreground/30" />
             </div>
           )}
 
           <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
             <Link 
               to="/" 
               className="absolute top-8 left-8 flex items-center gap-2 text-sm uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity"
             >
               <ArrowLeft className="w-4 h-4" /> Voltar
             </Link>
 
             {!loading && (
               <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                 <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] uppercase tracking-[0.2em] mb-6">
                   <Sparkles className="w-3 h-3" /> Coleção Exclusiva
                 </span>
                 <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-light mb-6 tracking-tight">
                   {colecao?.nome}
                 </h1>
                 {colecao?.descricao && (
                   <p className="text-lg sm:text-xl font-light text-white/90 max-w-2xl mx-auto leading-relaxed italic">
                     "{colecao.descricao}"
                   </p>
                 )}
               </div>
             )}
           </div>
 
           {/* Decorative scroll indicator */}
           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
             <div className="w-[1px] h-12 bg-white" />
           </div>
         </section>
 
         <PageContainer className="py-16 sm:py-24">
           <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-border pb-8">
             <div className="max-w-2xl">
               <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">Curadoria Mariela</h2>
               <p className="text-muted-foreground font-light leading-relaxed">
                 Cada peça desta coleção foi selecionada pensando na sofisticação e no conforto da mulher contemporânea. 
                 Peças que transcendem tendências passageiras.
               </p>
             </div>
             <div className="mt-6 md:mt-0">
               <span className="text-sm font-light text-muted-foreground uppercase tracking-widest">
                 {produtos.length} Peças Selecionadas
               </span>
             </div>
           </div>
 
           {loading ? (
             <ProductsLoadingSkeleton count={8} />
           ) : produtos.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
               {produtos.map((produto) => (
                 <ProductCard key={produto.id} produto={produto} />
               ))}
             </div>
           ) : (
             <div className="py-20 text-center">
               <p className="text-muted-foreground font-light italic">
                 Esta coleção está sendo preparada para você. Volte em breve.
               </p>
             </div>
           )}
         </PageContainer>
       </main>
 
       <Footer />
     </div>
   );
 };
 
 export default CollectionDetail;