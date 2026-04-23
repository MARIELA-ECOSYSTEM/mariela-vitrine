import type { Produto } from "@/data/products";

export type PublicProductBadgeType = "queridinho" | "em_alta" | "mais_procurado" | "destaque";

export interface PublicProductBadge {
  type: PublicProductBadgeType;
  label: string;
  description: string;
  priority: number;
}

const PUBLIC_BADGES: Record<PublicProductBadgeType, PublicProductBadge> = {
  queridinho: {
    type: "queridinho",
    label: "Queridinho da loja",
    description: "Produto com ótima resposta comercial",
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
  destaque: {
    type: "destaque",
    label: "Destaque da coleção",
    description: "Peça selecionada para a vitrine",
    priority: 1,
  },
};

function readExplicitBadge(produto: Produto): PublicProductBadge | null {
  const source = produto as Produto & {
    badgePublico?: string;
    publicBadge?: string;
    destaque_publico?: string;
    recomendacao_publica?: string;
  };
  const raw = source.badgePublico || source.publicBadge || source.destaque_publico || source.recomendacao_publica;
  if (!raw) return null;

  const normalized = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("querid")) return PUBLIC_BADGES.queridinho;
  if (normalized.includes("alta")) return PUBLIC_BADGES.em_alta;
  if (normalized.includes("procur")) return PUBLIC_BADGES.mais_procurado;
  if (normalized.includes("desta")) return PUBLIC_BADGES.destaque;
  return null;
}

export function getPublicProductBadge(produto: Produto): PublicProductBadge | null {
  const explicit = readExplicitBadge(produto);
  if (explicit) return explicit;

  const candidates: PublicProductBadge[] = [];
  if (produto.isNovidade && produto.emPromocao) candidates.push(PUBLIC_BADGES.queridinho);
  if (produto.isNovidade) candidates.push(PUBLIC_BADGES.em_alta);
  if (produto.emPromocao) candidates.push(PUBLIC_BADGES.destaque);
  if (produto.colecao) candidates.push(PUBLIC_BADGES.mais_procurado);

  return candidates.sort((a, b) => b.priority - a.priority)[0] || null;
}