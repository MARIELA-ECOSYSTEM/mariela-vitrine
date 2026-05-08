
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
 * Centraliza a regra de elegibilidade de coleções.
 * Mesma lógica usada no frontend para consistência total.
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

  if (colecao.quantidade_produtos === 0) {
    motivos.push("Sem produtos disponíveis");
  }

  return {
    elegivel: motivos.length === 0,
    motivos
  };
}