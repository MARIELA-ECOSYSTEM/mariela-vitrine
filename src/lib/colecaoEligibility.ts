
export interface ColecaoElegibilidadeRaw {
  id?: string;
  nome?: string;
  destaque?: boolean;
  ativo?: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
  quantidade_produtos?: number;
}

export interface ElegibilidadeResult {
  elegivel: boolean;
  motivos: string[];
}

/**
 * Centraliza a regra de elegibilidade de coleções para exibição na Home.
 * Implementa os critérios solicitados: destaque=true, ativo=true, dentro do período,
 * e com produtos disponíveis.
 */
export function isColecaoElegivelParaHome(colecao: ColecaoElegibilidadeRaw): ElegibilidadeResult {
  const motivos: string[] = [];
  const agora = Date.now();

  if (!colecao.id || !colecao.nome) {
    motivos.push("ID ou Nome ausentes");
  }

  if (colecao.destaque !== true) {
    motivos.push("Não é destaque (destaque != true)");
  }

  // Ativo por padrão se ausente (retrocompatibilidade), mas se vier false, exclui.
  if (colecao.ativo === false) {
    motivos.push("Inativa (ativo = false)");
  }

  if (colecao.data_inicio) {
    const inicio = Date.parse(colecao.data_inicio);
    if (Number.isFinite(inicio) && agora < inicio) {
      motivos.push(`Fora do período (inicia em ${colecao.data_inicio})`);
    }
  }

  if (colecao.data_fim) {
    const fim = Date.parse(colecao.data_fim);
    if (Number.isFinite(fim) && agora > fim) {
      motivos.push(`Fora do período (encerrou em ${colecao.data_fim})`);
    }
  }

  // Se a API informou a quantidade, validamos se há produtos.
  // Note: Se quantidade_produtos for undefined, assumimos que pode ter produtos (retrocompatibilidade).
  if (colecao.quantidade_produtos === 0) {
    motivos.push("Sem produtos disponíveis");
  }

  return {
    elegivel: motivos.length === 0,
    motivos
  };
}

/**
 * Versão simplificada (booleana) para uso em filtros rápidos.
 */
export function checkColecaoElegivel(colecao: ColecaoElegibilidadeRaw): boolean {
  return isColecaoElegivelParaHome(colecao).elegivel;
}