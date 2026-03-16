import { Link } from "react-router-dom";
import { CATEGORIAS_DB } from "@/data/categories";
import { ShoppingBag } from "lucide-react";

const categoryImages: Record<string, string> = {
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

export const CategoryNav = () => {
  const visibleCategories = CATEGORIAS_DB.filter(c => c.value !== "todas" && c.value !== "outros");

  return (
    <section className="py-4 sm:py-8 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-1 scrollbar-hide justify-start sm:justify-center">
          {/* Ver Todos - Destaque */}
          <Link
            to="/products"
            className="flex flex-col items-center gap-1.5 min-w-[56px] sm:min-w-[72px] group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-md ring-2 ring-primary/30">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <span className="text-[10px] sm:text-xs text-primary font-semibold whitespace-nowrap">
              Ver Todos
            </span>
          </Link>

          {visibleCategories.map((cat) => (
            <Link
              key={cat.value}
              to={`/products?categoria=${cat.value}`}
              className="flex flex-col items-center gap-1.5 min-w-[56px] sm:min-w-[72px] group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-secondary flex items-center justify-center text-xl sm:text-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300 border border-border group-hover:border-primary/30">
                {categoryImages[cat.value] || "🛍️"}
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-primary transition-colors font-medium whitespace-nowrap">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
