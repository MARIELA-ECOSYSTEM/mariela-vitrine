 import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
 import { SEOMeta } from "@/components/seo/SEOMeta";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

   return (
     <div className="flex min-h-screen items-center justify-center bg-background">
        <SEOMeta title="Página Não Encontrada | Mariela" description="Desculpe, a página que você está procurando não existe ou foi movida." noIndex={true} />
       <div className="text-center px-4">
         <h1 className="font-serif text-6xl font-bold mb-6 text-primary">404</h1>
         <p className="text-xl text-muted-foreground mb-8">Oops! Página não encontrada</p>
         <Link 
           to="/" 
           className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
         >
           Voltar para o Início
         </Link>
      </div>
    </div>
  );
};

export default NotFound;
