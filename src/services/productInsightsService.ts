import type { Produto } from "@/data/products";

export type PublicProductBadgeType = "queridinho_loja" | "em_alta" | "mais_procurado" | "destaque_colecao";

export interface PublicProductBadge {
  type: PublicProductBadgeType;
  label: string;
  description: string;
  priority: number;
}

export const PUBLIC_BADGES: Record<PublicProductBadgeType, PublicProductBadge> = {
  queridinho_loja: {
    type: "queridinho_loja",
    label: "Queridinho da loja",
    description: "Peça querida pelas clientes",
    priority: 4,
  },
  em_alta: {
    type: "em_alta",
    label: "Em alta",
    description: "Peça em destaque na loja",
    priority: 3,
  },
  mais_procurado: {
    type: "mais_procurado",
    label: "Mais procurado",
    description: "Produto com alta procura",
    priority: 2,
  },
  destaque_colecao: {
    type: "destaque_colecao",
    label: "Destaque da coleção",
    description: "Peça selecionada para a vitrine",
    priority: 1,
  },
};

export function isPublicProductBadgeType(value: string): value is PublicProductBadgeType {
  return value === "queridinho_loja" || value === "em_alta" || value === "mais_procurado" || value === "destaque_colecao";
}

function readExplicitBadge(produto: Produto): PublicProductBadge | null {
  const source = produto as Produto & {
    badgePublico?: string;
    publicBadge?: string;
    destaque_publico?: string;
    recomendacao_publica?: string;
  };
  const raw = source.badgePublico || source.publicBadge || source.destaque_publico || source.recomendacao_publica;
  if (!raw) return null;

  const normalized = raw.trim().toLowerCase();
  return isPublicProductBadgeType(normalized) ? PUBLIC_BADGES[normalized] : null;
}

export function getPublicProductBadge(produto: Produto): PublicProductBadge | null {
  return readExplicitBadge(produto);
}