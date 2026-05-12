  import { useEffect, useState, useMemo, useCallback } from "react";
  import { useParams, useLocation, Link, useSearchParams } from "react-router-dom";
 import { Header } from "@/components/Header";
 import { Footer } from "@/components/Footer";
  import { Breadcrumbs } from "@/components/Breadcrumbs";
 import { PageContainer } from "@/components/PageContainer";
 import { ProductCard } from "@/components/ProductCard";
  import { ProductsLoadingSkeleton, ProductSkeleton } from "@/components/ProductSkeleton";
  import { ProductFilters } from "@/components/ProductFilters";
 import { 
   vitrineApiService, 
    type ColecaoDestaque,
    type FilterOption
 } from "@/services/vitrineApiService";
 import type { Produto } from "@/data/products";
 import { updateSeo } from "@/lib/seo";
  import { ArrowLeft, Sparkles, ImageOff, Filter, Grid3x3, List, ShoppingBag } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
  import { CATEGORIAS_DB } from "@/data/categories";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";

  const categoryEmojis: Record<string, string> = {
    "vestidos": "👗",
    "blusas": "👚",
    "calças": "👖",
    "saias": "🩱",
    "shorts": "🩳",
    "short-saias": "✨",
    "conjuntos": "💎",
    "bolsas": "👜",
    "acessorios": "💍",
  };

  const produtosPorPagina = 12;
 
 const CollectionDetail = () => {
   const { id } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
   const [colecao, setColecao] = useState<ColecaoDestaque | null>(null);
   const [produtos, setProdutos] = useState<Produto[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(false);
    const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("todas");
    const [ordenarPor, setOrdenarPor] = useState<string>("padrao");
    const [coresSelecionadas, setCoresSelecionadas] = useState<string[]>([]);
    const [tamanhosSelecionados, setTamanhosSelecionados] = useState<string[]>([]);
    const [faixaPreco, setFaixaPreco] = useState<[number, number]>([0, 0]);
    const [precoAlterado, setPrecoAlterado] = useState(false);
    const [paginaAtual, setPaginaAtual] = useState(1);
 
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
 
 
 export default CollectionDetail;