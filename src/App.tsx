import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { PageTransition } from "@/components/PageTransition";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { InstallPWAPrompt } from "@/components/InstallPWAPrompt";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import MonteSeuLook from "./pages/MonteSeuLook";
import Cart from "./pages/Cart";
import Instalar from "./pages/Instalar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  
  return (
    <>
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/produto/:slug" element={<ProductDetail />} />
          <Route path="/monte-seu-look" element={<MonteSeuLook />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/instalar" element={<Instalar />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
      <NetworkStatusIndicator />
      <InstallPWAPrompt />
      <NotificationPrompt />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <ProductsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </ProductsProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
