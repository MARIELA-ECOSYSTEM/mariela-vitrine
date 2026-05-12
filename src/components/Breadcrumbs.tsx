import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  currentPage: string;
}

const ROUTE_NAMES: Record<string, string> = {
  products: "Produtos",
  catalogo: "Catálogo",
  produto: "Produto",
  produtos: "Produtos",
  cart: "Carrinho",
  "monte-seu-look": "Monte Seu Look",
  "collections": "Coleções",
  "colecoes": "Coleções",
};

const CANONICAL_PATHS: Record<string, string> = {
  catalogo: "/products",
  produtos: "/products",
};

export const Breadcrumbs = ({ items, currentPage }: BreadcrumbsProps) => {
  const location = useLocation();

  // Auto-generate breadcrumbs if not provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const paths = location.pathname.split("/").filter(Boolean);
    return paths.slice(0, -1).map((path, index) => ({
      label: ROUTE_NAMES[path] || path,
      path: CANONICAL_PATHS[path] || "/" + paths.slice(0, index + 1).join("/"),
    }));
  })();

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-sm text-muted-foreground mb-4 md:mb-6 animate-fade-in"
    >
      <Link 
        to="/" 
        className="flex items-center gap-1 hover:text-primary transition-colors"
        aria-label="Início"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Início</span>
      </Link>

      {breadcrumbItems.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {item.path ? (
            <Link 
              to={item.path} 
              className="hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}

      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      <span className="text-foreground font-medium truncate max-w-[200px]">
        {currentPage}
      </span>
    </nav>
  );
};
