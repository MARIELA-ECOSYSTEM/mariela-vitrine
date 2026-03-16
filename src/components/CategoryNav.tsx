import { Link } from "react-router-dom";
import { CATEGORIAS_DB } from "@/data/categories";

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
    <section className="py-8 sm:py-12 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 scrollbar-hide justify-start sm:justify-center">
          {visibleCategories.map((cat) => (
            <Link
              key={cat.value}
              to={`/products?categoria=${cat.value}`}
              onClick={(e) => { e.preventDefault(); window.location.href = `/products?categoria=${cat.value}`; }}
              className="flex flex-col items-center gap-2 min-w-[64px] sm:min-w-[80px] group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-secondary flex items-center justify-center text-2xl sm:text-3xl group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300 border border-border group-hover:border-primary/30">
                {categoryImages[cat.value] || "🛍️"}
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground group-hover:text-primary transition-colors font-medium whitespace-nowrap">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
