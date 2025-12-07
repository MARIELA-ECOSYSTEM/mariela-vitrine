import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Produto } from "@/data/products";

interface ProductSearchProps {
  produtos: Produto[];
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const ProductSearch = ({ produtos, onSearch, searchQuery }: ProductSearchProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Gerar sugestões baseadas no termo de busca
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const uniqueSuggestions = new Set<string>();

    produtos.forEach(produto => {
      // Buscar no nome
      if (produto.nome.toLowerCase().includes(query)) {
        uniqueSuggestions.add(produto.nome);
      }

      // Buscar na categoria
      if (produto.categoria.toLowerCase().includes(query)) {
        uniqueSuggestions.add(produto.categoria);
      }

      // Buscar nas cores
      produto.variants.forEach(v => {
        if (v.cor.toLowerCase().includes(query)) {
          uniqueSuggestions.add(v.cor);
        }
      });
    });

    const suggestionList = Array.from(uniqueSuggestions).slice(0, 5);
    setSuggestions(suggestionList);
    setShowSuggestions(suggestionList.length > 0);
    setSelectedIndex(-1);
  }, [searchQuery, produtos]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onSearch("");
    setShowSuggestions(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar produtos, categorias, cores..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sugestões de autocomplete */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in">
          <div className="py-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  selectedIndex === index && "bg-accent text-accent-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span>{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
