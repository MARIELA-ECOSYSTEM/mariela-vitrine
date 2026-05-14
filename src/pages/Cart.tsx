import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageContainer } from "@/components/PageContainer";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PRODUCT_IMAGE_PLACEHOLDER as produtoGenerico } from "@/lib/productImage";
 import { formatBRL, getDisplayPrice } from "@/lib/formatters";
 import { SEOMeta } from "@/components/seo/SEOMeta";

const Cart = () => {
  const { items, removeFromCart, clearCart, getTotalValue } = useCart();

  const handleWhatsApp = () => {
    const whatsappNumber = "5583987373396";
    
    const itemsText = items.map((item) =>
      `${item.product.nome} | ${item.size} - ${formatBRL(getDisplayPrice(item.product))}`
    ).join("\n\n");

    const message = `✨ Olá!\n\nEstou finalizando meu pedido do Site Mariela e gostaria de confirmar as peças abaixo:\n\n${itemsText}\n\n💜 Total do pedido: ${formatBRL(getTotalValue())}\n\nPode me ajudar a concluir a compra, por favor? 🤩`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (items.length === 0) {
   return (
     <div className="min-h-screen flex flex-col pt-[60px] sm:pt-[68px]">
       <SEOMeta title="Meu Carrinho | Mariela Moda Feminina" description="Finalize suas compras na Mariela. Confira suas peças selecionadas e finalize seu pedido pelo WhatsApp." />
       <Header />
        <main className="flex-1">
          <PageContainer padX="px-4 md:px-6">
            <Breadcrumbs currentPage="Carrinho" />
            <Card className="max-w-2xl mx-auto text-center py-16">
              <CardContent>
                <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-serif font-bold mb-2">Carrinho Vazio</h2>
                <p className="text-muted-foreground mb-6">
                  Você ainda não adicionou nenhum produto ao carrinho
                </p>
                <Button asChild>
                  <Link to="/products">Ver Produtos</Link>
                </Button>
              </CardContent>
            </Card>
          </PageContainer>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-[60px] sm:pt-[68px]">
      <Header />
      <main className="flex-1">
        <PageContainer padX="px-4 md:px-6">
          <Breadcrumbs currentPage="Meu Carrinho" />
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                Meu Carrinho
              </h1>
              <Button
                variant="outline"
                onClick={clearCart}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Tudo
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4 mb-6">
                  {items.map((item, index) => (
                    <div
                      key={`${item.product.id}-${item.size}-${index}`}
                      className="flex gap-4 p-4 bg-secondary/20 rounded-lg"
                    >
                      <img
                        src={item.product.imagens.length > 0 ? item.product.imagens[0] : produtoGenerico}
                        alt={item.product.nome}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">
                          {item.product.nome}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Tamanho: {item.size}
                        </p>
                        <p className="text-lg font-semibold text-primary mt-2">
                          {formatBRL(getDisplayPrice(item.product))}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.product.id, item.size)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex justify-between items-center text-xl font-semibold">
                    <span className="text-foreground">Total:</span>
                    <span className="text-primary">
                      {formatBRL(getTotalValue())}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-5 w-5" />
                  Enviar Pedido pelo WhatsApp
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
