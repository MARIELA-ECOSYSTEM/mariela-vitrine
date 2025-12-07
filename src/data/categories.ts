// Categorias do banco de dados - valores devem corresponder aos valores mapeados em products.ts
export const CATEGORIAS_DB = [
  { value: "todas", label: "Todas", dbValue: null },
  { value: "calças", label: "Calças", dbValue: "Calça" },
  { value: "saias", label: "Saias", dbValue: "Saia" },
  { value: "vestidos", label: "Vestidos", dbValue: "Vestido" },
  { value: "blusas", label: "Blusas", dbValue: "Blusa" },
  { value: "bolsas", label: "Bolsas", dbValue: "Bolsa" },
  { value: "acessorios", label: "Acessórios", dbValue: "Acessório" },
  { value: "short-saias", label: "Short-Saias", dbValue: "Short-Saia" },
  { value: "shorts", label: "Shorts", dbValue: "Short" },
  { value: "conjuntos", label: "Conjuntos", dbValue: "Conjunto" },
  { value: "outros", label: "Outros", dbValue: "Outro" },
] as const;

export type CategoriaDB = typeof CATEGORIAS_DB[number]['value'];
