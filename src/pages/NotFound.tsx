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
       <SEOMeta title="404 - Página Não Encontrada | Mariela" description="Desculpe, a página que você está procurando não existe." />
       <div className="text-center px-4">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
