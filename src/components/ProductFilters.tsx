import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface ProductFiltersProps {
  // Filtros atuais
  categoriaSelecionada: string;
  setCategoriaSelecionada: (value: string) => void;
  colecaoSelecionada?: string;
  setColecaoSelecionada?: (value: string) => void;
  mostrarPromocao?: boolean;
  setMostrarPromocao?: (value: boolean) => void;
  mostrarNovidades?: boolean;
  setMostrarNovidades?: (value: boolean) => void;
  coresSelecionadas: string[];
  setCoresSelecionadas: (value: string[]) => void;
  tamanhosSelecionados: string[];
  setTamanhosSelecionados: (value: string[]) => void;
  faixaPreco: [number, number];
  setFaixaPreco: (value: [number, number]) => void;
  setPrecoAlterado?: (value: boolean) => void;
  
  // Dados disponíveis
  coresDisponiveis: string[];
  tamanhosDisponiveis: string[];
  precoMin: number;
  precoMax: number;
  categoriasDisponiveis?: ReadonlyArray<{ value: string; label: string }>;
  colecoesDisponiveis?: ReadonlyArray<{ value: string; label: string }>;
  categoriasCount?: Record<string, number>;
  produtos?: any[];
  produtosFiltradosParcial?: any[];
  
  // Ações
  onLimparFiltros: () => void;
  setPaginaAtual: (value: number) => void;
  activeFiltersCount: number;
  precoAlterado?: boolean;
}

import { CATEGORIAS_DB } from "@/data/categories";

const categorias = CATEGORIAS_DB;

const FiltersContent = ({ 
  categoriaSelecionada,
  setCategoriaSelecionada,
  colecaoSelecionada = "todas",
  setColecaoSelecionada = () => {},
  mostrarPromocao = false,
  setMostrarPromocao = () => {},
  mostrarNovidades = false,
  setMostrarNovidades = () => {},
  coresSelecionadas,
  setCoresSelecionadas,
  tamanhosSelecionados,
  setTamanhosSelecionados,
  faixaPreco,
  setFaixaPreco,
  setPrecoAlterado = () => {},
  coresDisponiveis,
  tamanhosDisponiveis,
  precoMin,
  precoMax,
  categoriasDisponiveis = categorias,
  colecoesDisponiveis = [],
  categoriasCount = {},
  produtos = [],
  produtosFiltradosParcial = [],
  onLimparFiltros,
  setPaginaAtual,
  precoAlterado = false,
}: ProductFiltersProps) => {
  
  // Calcular quantidade por cor (baseado nos produtos filtrados parcialmente)
  const coresCount: Record<string, number> = {};
  coresDisponiveis.forEach(cor => {
    const count = produtosFiltradosParcial.filter(p => 
      p.variants.some((v: any) => v.cor === cor && (tamanhosSelecionados.length === 0 || tamanhosSelecionados.includes(v.tamanho)))
    ).length;
    coresCount[cor] = count;
  });
  
  // Calcular quantidade por tamanho (baseado nos produtos filtrados parcialmente)
  const tamanhosCount: Record<string, number> = {};
  tamanhosDisponiveis.forEach(tamanho => {
    const count = produtosFiltradosParcial.filter(p =>
      p.variants.some((v: any) => v.tamanho === tamanho && (coresSelecionadas.length === 0 || coresSelecionadas.includes(v.cor)))
    ).length;
    tamanhosCount[tamanho] = count;
  });
  
  // Calcular quantidade na faixa de preço atual
  const precoCount = produtosFiltradosParcial.filter(p => {
    const preco = p.emPromocao && p.precoPromocional ? p.precoPromocional : p.precoVenda;
    return preco >= faixaPreco[0] && preco <= faixaPreco[1];
  }).length;
  const hasActiveFilters = categoriaSelecionada !== "todas" || 
    colecaoSelecionada !== "todas" ||
    coresSelecionadas.length > 0 || 
    tamanhosSelecionados.length > 0 || 
    (precoAlterado && (faixaPreco[0] !== precoMin || faixaPreco[1] !== precoMax));

  // Estados para controlar abertura das seções
  const [categoriaAberta, setCategoriaAberta] = useState(false);
  const [colecaoAberta, setColecaoAberta] = useState(false);
  const [coresAberta, setCoresAberta] = useState(false);
  const [tamanhosAberta, setTamanhosAberta] = useState(false);
  const [precoAberto, setPrecoAberto] = useState(false);

  return (
    <div className="space-y-6">
      {/* Limpar Filtros */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onLimparFiltros}
          className="w-full gap-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
          Limpar Filtros
        </Button>
      )}

      {/* Categorias */}
      <div className="space-y-3 border-b border-border pb-4">
        <button
          onClick={() => setCategoriaAberta(!categoriaAberta)}
          className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Categoria</h3>
          {categoriaAberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {categoriaAberta && (
          <div className="flex flex-col gap-2 animate-fade-in transition-all duration-300">
            {categoriasDisponiveis.map((cat) => (
              <Button
                key={cat.value}
                variant={categoriaSelecionada === cat.value ? "default" : "ghost"}
                onClick={() => {
                  setCategoriaSelecionada(cat.value);
                  setPaginaAtual(1);
                }}
                className="justify-between group transition-all duration-300"
                size="sm"
              >
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  {cat.label}
                </span>
                {categoriasCount[cat.value] !== undefined && (
                  <Badge 
                    variant={categoriaSelecionada === cat.value ? "secondary" : "outline"}
                    className="ml-2 transition-all duration-300"
                  >
                    {categoriasCount[cat.value]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>

      {colecoesDisponiveis.length > 0 && (
        <div className="space-y-3 border-b border-border pb-4">
          <button
            onClick={() => setColecaoAberta(!colecaoAberta)}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Coleção</h3>
            {colecaoAberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {colecaoAberta && (
            <div className="flex flex-col gap-2 animate-fade-in transition-all duration-300">
              {colecoesDisponiveis.map((colecao) => (
                <Button
                  key={colecao.value}
                  variant={colecaoSelecionada === colecao.value ? "default" : "ghost"}
                  onClick={() => {
                    setColecaoSelecionada(colecao.value);
                    setPaginaAtual(1);
                  }}
                  className="justify-between group transition-all duration-300"
                  size="sm"
                >
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    {colecao.label}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cores */}
      <div className="space-y-3 border-b border-border pb-4">
        <button
          onClick={() => setCoresAberta(!coresAberta)}
          className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Cores</h3>
            {coresSelecionadas.length > 0 && (
              <Badge variant="secondary">{coresSelecionadas.length}</Badge>
            )}
          </div>
          {coresAberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {coresAberta && (
          <div className="animate-fade-in">
            {coresDisponiveis.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {coresDisponiveis.map((cor) => (
                  <Button
                    key={cor}
                    variant={coresSelecionadas.includes(cor) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const novasCores = coresSelecionadas.includes(cor)
                        ? coresSelecionadas.filter(c => c !== cor)
                        : [...coresSelecionadas, cor];
                      setCoresSelecionadas(novasCores);
                    }}
                    className="justify-between gap-2"
                  >
                    <span>{cor}</span>
                    <Badge 
                      variant={coresSelecionadas.includes(cor) ? "secondary" : "outline"}
                      className="ml-1"
                    >
                      {coresCount[cor] || 0}
                    </Badge>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma cor disponível</p>
            )}
          </div>
        )}
      </div>

      {/* Tamanhos */}
      <div className="space-y-3 border-b border-border pb-4">
        <button
          onClick={() => setTamanhosAberta(!tamanhosAberta)}
          className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Tamanhos</h3>
            {tamanhosSelecionados.length > 0 && (
              <Badge variant="secondary">{tamanhosSelecionados.length}</Badge>
            )}
          </div>
          {tamanhosAberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {tamanhosAberta && (
          <div className="animate-fade-in">
            {tamanhosDisponiveis.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tamanhosDisponiveis.map((tamanho) => (
                  <Button
                    key={tamanho}
                    variant={tamanhosSelecionados.includes(tamanho) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const novosTamanhos = tamanhosSelecionados.includes(tamanho)
                        ? tamanhosSelecionados.filter(t => t !== tamanho)
                        : [...tamanhosSelecionados, tamanho];
                      setTamanhosSelecionados(novosTamanhos);
                    }}
                    className="justify-between gap-2"
                  >
                    <span>{tamanho}</span>
                    <Badge 
                      variant={tamanhosSelecionados.includes(tamanho) ? "secondary" : "outline"}
                      className="ml-1"
                    >
                      {tamanhosCount[tamanho] || 0}
                    </Badge>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum tamanho disponível</p>
            )}
          </div>
        )}
      </div>

      {/* Faixa de Preço */}
      <div className="space-y-3">
        <button
          onClick={() => setPrecoAberto(!precoAberto)}
          className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Preço</h3>
          {precoAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {precoAberto && (
          <div className="space-y-4 px-2 animate-fade-in">
            {/* Inputs numéricos */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Mínimo</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min={precoMin}
                    max={faixaPreco[1]}
                    value={faixaPreco[0]}
                    onChange={(e) => {
                      const rawValue = Number(e.target.value);
                      const value = Math.max(0, precoMin, Math.min(Number.isFinite(rawValue) ? rawValue : precoMin, faixaPreco[1]));
                      setFaixaPreco([value, faixaPreco[1]]);
                      setPrecoAlterado(true);
                    }}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
              <span className="text-muted-foreground mt-5">—</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Máximo</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min={faixaPreco[0]}
                    max={precoMax}
                    value={faixaPreco[1]}
                    onChange={(e) => {
                      const rawValue = Number(e.target.value);
                      const value = Math.min(precoMax, Math.max(Number.isFinite(rawValue) ? rawValue : faixaPreco[0], 0, faixaPreco[0]));
                      setFaixaPreco([faixaPreco[0], value]);
                      setPrecoAlterado(true);
                    }}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Slider */}
            <Slider
              min={precoMin}
              max={precoMax}
              step={1}
              value={faixaPreco}
              onValueChange={(value) => {
                const [min, max] = value as [number, number];
                setFaixaPreco([Math.max(0, Math.min(min, max)), Math.max(0, Math.max(min, max))]);
                setPrecoAlterado(true);
              }}
              className="w-full"
            />

            {/* Contador de produtos */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                {precoCount} {precoCount === 1 ? 'produto' : 'produtos'}
              </Badge>
            </div>

            {/* Botões de reset rápido */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFaixaPreco([precoMin, precoMax]);
                  setPrecoAlterado(false);
                }}
                className="flex-1 text-xs"
              >
                Limpar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFaixaPreco([precoMin, Math.floor((precoMin + precoMax) / 2)]);
                  setPrecoAlterado(true);
                }}
                className="flex-1 text-xs"
              >
                Até 50%
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ProductFilters = (props: ProductFiltersProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Filter className="h-5 w-5" />
          Filtros
          {props.activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {props.activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <FiltersContent {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
