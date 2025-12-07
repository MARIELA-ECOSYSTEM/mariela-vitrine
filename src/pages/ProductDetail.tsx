import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ImageGallery } from "@/components/ImageGallery";
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
  
  const whatsappNumber = "5583987373396";

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
    
    const message = `✨ Olá! 👋\nVi a peça ${produto.nome} | ${corParaUsar} | ${tamanhoParaUsar} - ${precoFormatado} no Site Mariela 🤩\nAinda tá disponível?`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-24 bg-background">
        <div className="container mx-auto px-6 animate-fade-in">
          <Breadcrumbs 
            items={[{ label: "Produtos", path: "/products" }]} 
            currentPage={produto.nome} 
          />
          
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-8 gap-2 hover:scale-105 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
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
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-4xl font-bold mb-4 text-foreground">
                  {produto.nome}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                {produto.emPromocao && precoOriginalFormatado && (
                  <p className="text-2xl text-muted-foreground line-through">
                    {precoOriginalFormatado}
                  </p>
                )}
                <p className={`text-4xl font-bold ${produto.emPromocao ? 'text-destructive' : 'text-primary'}`}>
                  {precoFormatado}
                </p>
              </div>

              <p className="text-muted-foreground text-lg leading-relaxed">
                {produto.descricao}
              </p>

              <div className="border-t border-b border-border py-6 space-y-6">
                <div>
                  <p className="font-medium mb-2">Categoria</p>
                  <Badge variant="secondary" className="capitalize">
                    {produto.categoria}
                  </Badge>
                </div>

                {!isAcessorio && (
                  <>
                    <div>
                      <p className="font-medium text-lg mb-3">Selecione a Cor:</p>
                      <div className="flex flex-wrap gap-2">
                        {coresDisponiveis.map((cor) => (
                          <Button
                            key={cor}
                            variant={corSelecionada === cor ? "default" : "outline"}
                            size="lg"
                            onClick={() => {
                              setCorSelecionada(cor);
                              setTamanhoSelecionado("");
                            }}
                            className="transition-all hover:scale-105 gap-2"
                          >
                            <span 
                              className="w-4 h-4 rounded-full border-2 border-background shadow-sm"
                              style={{ 
                                backgroundColor: COLOR_MAP[cor] || "#94A3B8",
                                boxShadow: cor === "Branco" || cor === "Off White" ? "0 0 0 1px #E2E8F0" : "none"
                              }}
                            />
                            {cor}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {corSelecionada && (
                      <div>
                        <p className="font-medium text-lg mb-3">Selecione o Tamanho:</p>
                        <div className="flex flex-wrap gap-2">
                          {tamanhosDisponiveis.map((tamanho) => (
                            <Button
                              key={tamanho}
                              variant={tamanhoSelecionado === tamanho ? "default" : "outline"}
                              size="lg"
                              onClick={() => setTamanhoSelecionado(tamanho)}
                              className="transition-all hover:scale-105"
                            >
                              {tamanho}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <Button
                  size="lg"
                  onClick={handleAdicionarCarrinho}
                  className="w-full gap-2 text-lg py-6 transition-all hover:scale-105 hover:shadow-hover"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="w-full gap-2 text-lg py-6 transition-all hover:scale-105"
                >
                  <MessageCircle className="h-5 w-5" />
                  Comprar pelo WhatsApp
                </Button>
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
