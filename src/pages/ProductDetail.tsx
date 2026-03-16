import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ImageGallery } from "@/components/ImageGallery";
import { SizeGuide } from "@/components/SizeGuide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, ShoppingCart, ArrowLeft } from "lucide-react";

// Mapa de cores para as amostras visuais
const COLOR_MAP: Record<string, string> = {
  "Preto": "#000000",
  "Branco": "#FFFFFF",
  "Vermelho": "#DC2626",
  "Azul": "#2563EB",
  "Verde": "#16A34A",
  "Amarelo": "#EAB308",
  "Rosa": "#EC4899",
  "Roxo": "#9333EA",
  "Laranja": "#EA580C",
  "Marrom": "#92400E",
  "Cinza": "#6B7280",
  "Bege": "#D4C5B9",
  "Nude": "#E5D4C1",
  "Caqui": "#BDB76B",
  "Vinho": "#722F37",
  "Mostarda": "#FFDB58",
  "Off White": "#F8F8F8",
  "Caramelo": "#C68642",
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { produtos, loading } = useProducts();
  
  const produto = produtos.find(p => p.id === Number(id));
  const [corSelecionada, setCorSelecionada] = useState("");
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState("");
  const [imagemSelecionadaIndex, setImagemSelecionadaIndex] = useState(0);
  
  const whatsappNumber = "5583986567915";

  // Obter cores disponíveis (não depende de tamanho)
  const coresDisponiveis = useMemo(() => {
    if (!produto) return [];
    const cores = new Set<string>();
    produto.variants
      .filter(v => v.disponibilidade > 0)
      .forEach(v => cores.add(v.cor));
    return Array.from(cores);
  }, [produto]);

  // Obter tamanhos disponíveis (depende da cor selecionada)
  const tamanhosDisponiveis = useMemo(() => {
    if (!produto || !corSelecionada) return [];
    const tamanhos = new Set<string>();
    produto.variants
      .filter(v => v.disponibilidade > 0 && v.cor === corSelecionada)
      .forEach(v => tamanhos.add(v.tamanho));
    return Array.from(tamanhos);
  }, [produto, corSelecionada]);

  // Mapa de cores para tamanhos disponíveis
  const coresTamanhosMap = useMemo(() => {
    if (!produto) return {};
    const map: Record<string, string[]> = {};
    produto.variants
      .filter(v => v.disponibilidade > 0)
      .forEach(v => {
        if (!map[v.cor]) map[v.cor] = [];
        if (!map[v.cor].includes(v.tamanho)) map[v.cor].push(v.tamanho);
      });
    return map;
  }, [produto]);

  // Sempre mostrar todas as imagens no carrossel
  const imagensParaMostrar = useMemo(() => {
    if (!produto) return [];
    return produto.imagens;
  }, [produto]);

  // Sincronizar imagem selecionada com cor selecionada
  useEffect(() => {
    if (!produto || !corSelecionada) return;
    
    const varianteIndex = produto.variants.findIndex(v => v.cor === corSelecionada);
    if (varianteIndex >= 0 && varianteIndex < produto.imagens.length) {
      setImagemSelecionadaIndex(varianteIndex);
    }
  }, [corSelecionada, produto]);

  // Função para lidar com seleção de imagem do carrossel
  const handleImageSelect = (index: number) => {
    setImagemSelecionadaIndex(index);
    
    // Se houver uma cor correspondente, selecionar automaticamente
    if (produto && produto.variants[index]) {
      const corDaImagem = produto.variants[index].cor;
      setCorSelecionada(corDaImagem);
      setTamanhoSelecionado(""); // Reset tamanho ao trocar de cor
    }
  };

  if (!produto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
          <Link to="/products">
            <Button>Voltar para Produtos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAcessorio = produto.categoria === "bolsas" || produto.categoria === "acessorios";

  const precoFormatado = produto.emPromocao && produto.precoPromocional
    ? `R$ ${produto.precoPromocional.toFixed(2).replace('.', ',')}`
    : `R$ ${produto.precoVenda.toFixed(2).replace('.', ',')}`;

  const precoOriginalFormatado = produto.emPromocao && produto.precoPromocional
    ? `R$ ${produto.precoVenda.toFixed(2).replace('.', ',')}`
    : undefined;

  const handleAdicionarCarrinho = () => {
    const tamanhoParaAdicionar = isAcessorio ? "U" : tamanhoSelecionado;
    const corParaAdicionar = corSelecionada;

    if (!isAcessorio && !corParaAdicionar) {
      toast({
        title: "Selecione uma cor",
        description: "Por favor, escolha a cor antes de adicionar ao carrinho.",
        variant: "destructive",
      });
      return;
    }
    
    if (!tamanhoParaAdicionar) {
      toast({
        title: "Selecione um tamanho",
        description: "Por favor, escolha o tamanho antes de adicionar ao carrinho.",
        variant: "destructive",
      });
      return;
    }
    
    addToCart(produto, tamanhoParaAdicionar);
    toast({
      title: "Produto adicionado!",
      description: `${produto.nome} (${corParaAdicionar} - ${tamanhoParaAdicionar}) foi adicionado ao carrinho.`,
    });
  };

  const handleWhatsApp = () => {
    const tamanhoParaUsar = isAcessorio ? "U" : tamanhoSelecionado;
    const corParaUsar = corSelecionada;

    if (!isAcessorio && !corParaUsar) {
      toast({
        title: "Selecione uma cor",
        description: "Por favor, escolha a cor antes de enviar pelo WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    
    if (!tamanhoParaUsar) {
      toast({
        title: "Selecione um tamanho",
        description: "Por favor, escolha o tamanho antes de enviar pelo WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    
    const productLink = `${window.location.origin}/products/${produto.id}`;
    const message = `✨ Olá! 👋\nVi a peça ${produto.nome} | ${corParaUsar} | ${tamanhoParaUsar} - ${precoFormatado} no Site Mariela 🤩\n\n🔗 Link do produto: ${productLink}\n\nAinda tá disponível?`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background pt-[52px] sm:pt-[60px]">
      <Header />
      <main className="pb-8 md:pb-16">
        <div className="container mx-auto px-4 md:px-6 animate-fade-in">
          {/* Breadcrumbs - Hidden on mobile for cleaner look */}
          <div className="hidden md:block mb-4">
            <Breadcrumbs 
              items={[{ label: "Produtos", path: "/products" }]} 
              currentPage={produto.nome} 
            />
          </div>
          
          {/* Back Button - Mobile optimized */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 md:mb-6 gap-1.5 hover:scale-105 transition-all -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar</span>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 max-w-6xl mx-auto">
            {/* Galeria de Imagens */}
            <div className="animate-fade-in">
              <ImageGallery
                images={imagensParaMostrar}
                productName={produto.nome}
                emPromocao={produto.emPromocao}
                isNovidade={produto.isNovidade}
                selectedIndex={imagemSelecionadaIndex}
                onImageSelect={handleImageSelect}
              />
            </div>

            {/* Product Info */}
            <div className="space-y-4 md:space-y-6">
              {/* Nome do Produto */}
              <div>
                <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground leading-tight">
                  {produto.nome}
                </h1>
              </div>

              {/* Preço */}
              <div className="flex items-baseline gap-3 flex-wrap">
                {produto.emPromocao && precoOriginalFormatado && (
                  <p className="text-lg md:text-2xl text-muted-foreground line-through">
                    {precoOriginalFormatado}
                  </p>
                )}
                <p className={`text-3xl md:text-4xl font-bold ${produto.emPromocao ? 'text-destructive' : 'text-primary'}`}>
                  {precoFormatado}
                </p>
                {produto.emPromocao && (
                  <Badge variant="destructive" className="text-xs">
                    Economia de R$ {(produto.precoVenda - (produto.precoPromocional || 0)).toFixed(2).replace('.', ',')}
                  </Badge>
                )}
              </div>

              {/* Descrição */}
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                {produto.descricao}
              </p>

              {/* Categoria Badge + Guia de Medidas */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Categoria:</span>
                  <Badge variant="secondary" className="capitalize">
                    {produto.categoria}
                  </Badge>
                </div>
                {!isAcessorio && <SizeGuide categoria={produto.categoria} />}
              </div>

              {/* Seleção de Variantes */}
              {!isAcessorio && (
                <div className="space-y-5 pt-2">
                  {/* Seletor de Cor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm md:text-base">
                        Cor: <span className="text-primary font-semibold">{corSelecionada || "Selecione"}</span>
                      </p>
                      {corSelecionada && (
                        <span className="text-xs text-muted-foreground">
                          {coresDisponiveis.length} {coresDisponiveis.length === 1 ? 'cor disponível' : 'cores disponíveis'}
                        </span>
                      )}
                    </div>
                    
                    {/* Grid de Cores com Tamanhos */}
                    <div className="flex flex-col gap-2">
                      {coresDisponiveis.map((cor) => {
                        const tamanhosDaCor = coresTamanhosMap[cor] || [];
                        const isSelected = corSelecionada === cor;
                        
                        return (
                          <button
                            key={cor}
                            onClick={() => {
                              setCorSelecionada(cor);
                              setTamanhoSelecionado("");
                            }}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-md"
                                : "border-border hover:border-primary/50 bg-background"
                            }`}
                          >
                            <span 
                              className={`w-6 h-6 rounded-full border-2 shadow-inner transition-transform group-hover:scale-110 flex-shrink-0 ${
                                isSelected ? "border-primary" : "border-muted"
                              }`}
                              style={{ 
                                backgroundColor: COLOR_MAP[cor] || "#94A3B8",
                                boxShadow: (cor === "Branco" || cor === "Off White") 
                                  ? "inset 0 0 0 1px #E2E8F0, 0 1px 2px rgba(0,0,0,0.1)" 
                                  : "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }}
                            />
                            <div className="flex flex-col items-start gap-0.5 flex-1">
                              <span className={`text-sm font-semibold ${
                                isSelected ? "text-primary" : "text-foreground"
                              }`}>
                                {cor}
                              </span>
                              <span className={`text-xs ${
                                isSelected ? "text-primary/70" : "text-muted-foreground"
                              }`}>
                                Tamanhos: {tamanhosDaCor.join(" · ")}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="text-primary text-xs font-medium">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seletor de Tamanho */}
                  {corSelecionada && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm md:text-base">
                          Tamanho: <span className="text-primary font-semibold">{tamanhoSelecionado || "Selecione"}</span>
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {tamanhosDisponiveis.length} {tamanhosDisponiveis.length === 1 ? 'tamanho disponível' : 'tamanhos disponíveis'}
                        </span>
                      </div>
                      
                      {/* Grid de Tamanhos - Mobile friendly */}
                      <div className="flex flex-wrap gap-2">
                        {tamanhosDisponiveis.map((tamanho) => (
                          <button
                            key={tamanho}
                            onClick={() => setTamanhoSelecionado(tamanho)}
                            className={`min-w-[48px] h-12 px-4 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                              tamanhoSelecionado === tamanho
                                ? "border-primary bg-primary text-primary-foreground shadow-md"
                                : "border-border hover:border-primary/50 bg-background text-foreground"
                            }`}
                          >
                            {tamanho}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="space-y-3 pt-4">
                <Button
                  size="lg"
                  onClick={handleAdicionarCarrinho}
                  className="w-full gap-2 text-base md:text-lg h-12 md:h-14 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="w-full gap-2 text-base md:text-lg h-12 md:h-14 transition-all hover:scale-[1.02] active:scale-[0.98] border-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  Comprar pelo WhatsApp
                </Button>
              </div>

              {/* Info adicional mobile */}
              <div className="md:hidden pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Toque na imagem para ampliar • Deslize para ver mais fotos
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
