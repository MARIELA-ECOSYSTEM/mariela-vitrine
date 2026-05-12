
export enum ColecaoExclusionReason {
  ID_NOME_AUSENTE = "ID_NOME_AUSENTE",
  NAO_DESTAQUE = "COLECAO_NAO_DESTAQUE",
  INATIVA = "COLECAO_INATIVA",
  FORA_PERIODO = "COLECAO_FORA_PERIODO",
  SEM_PRODUTOS = "COLECAO_SEM_PRODUTOS",
  PRODUTOS_NAO_PUBLICAVEIS = "PRODUTOS_NAO_PUBLICAVEIS",
  SEM_MIDIA = "COLECAO_SEM_MIDIA"
}

export interface ColecaoElegibilidadeRaw {
  id?: string;
  nome?: string;
  destaque?: boolean;
  ativo?: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
  quantidade_produtos?: number;
  tem_produtos_invalidos?: boolean;
  home_destaque_url?: string | null;
  banner_url?: string | null;
  imagem_capa_url?: string | null;
}
 
 export interface ElegibilidadeResult {
   elegivel: boolean;
   motivos: ColecaoExclusionReason[];
   status: "HEALTHY" | "WARNING" | "INVALID";
 }
 
 /**
  * Obtém o timestamp atual no timezone America/Sao_Paulo.
  */
 export function getSaoPauloNow(): number {
   // Simulação robusta de timezone SP (UTC-3)
   const now = new Date();
   const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
   return spTime.getTime();
 }
 
 /**
  * Centraliza a regra de elegibilidade de coleções para exibição na Home.
  */
 export function isColecaoElegivelParaHome(colecao: ColecaoElegibilidadeRaw): ElegibilidadeResult {
   const motivos: ColecaoExclusionReason[] = [];
   const agora = getSaoPauloNow();
 
   if (!colecao.id || !colecao.nome) {
     motivos.push(ColecaoExclusionReason.ID_NOME_AUSENTE);
   }
 
   if (colecao.destaque !== true) {
     motivos.push(ColecaoExclusionReason.NAO_DESTAQUE);
   }
 
   if (colecao.ativo === false) {
     motivos.push(ColecaoExclusionReason.INATIVA);
   }
 
   if (colecao.data_inicio) {
     const inicio = Date.parse(colecao.data_inicio);
     if (Number.isFinite(inicio) && agora < inicio) {
       motivos.push(ColecaoExclusionReason.FORA_PERIODO);
     }
   }
 
   if (colecao.data_fim) {
     const fim = Date.parse(colecao.data_fim);
     if (Number.isFinite(fim) && agora > fim) {
       motivos.push(ColecaoExclusionReason.FORA_PERIODO);
     }
   }
 
   if (colecao.quantidade_produtos === 0) {
     motivos.push(ColecaoExclusionReason.SEM_PRODUTOS);
   }
 
    if (colecao.tem_produtos_invalidos === true) {
      motivos.push(ColecaoExclusionReason.PRODUTOS_NAO_PUBLICAVEIS);
    }

     const temMidia = (colecao.home_destaque_url?.trim() || 
                      colecao.banner_url?.trim() || 
                      colecao.imagem_capa_url?.trim());

     if (!temMidia) {
       motivos.push(ColecaoExclusionReason.SEM_MIDIA);
     }

   let status: "HEALTHY" | "WARNING" | "INVALID" = "HEALTHY";
   
   if (motivos.length > 0) {
     const criticos = [
        ColecaoExclusionReason.ID_NOME_AUSENTE,
        ColecaoExclusionReason.NAO_DESTAQUE,
        ColecaoExclusionReason.INATIVA
      ]; // ID_NOME_AUSENTE e INATIVA são os únicos bloqueios absolutos agora.
     
      const temCritico = motivos.some(m => criticos.includes(m)) || motivos.includes(ColecaoExclusionReason.ID_NOME_AUSENTE);
      
      if (temCritico) {
        status = "INVALID";
      } else {
        // FORA_PERIODO é impeditivo se estivermos em produção.
        // SEM_PRODUTOS e SEM_MIDIA agora são WARNINGS para permitir a exibição de coleções/banners
        // que podem estar em processo de cadastro ou que o PDV marcou como destaque mas falta algo.
        const impeditivos = [ColecaoExclusionReason.FORA_PERIODO];
        status = motivos.some(m => impeditivos.includes(m)) ? "INVALID" : "WARNING";
      }
    }
  
    // Elegível se não for INVALID. 
    // Isso permite que coleções SEM_MIDIA ou SEM_PRODUTOS passem pelo filtro inicial,
    // deixando a decisão de renderização final para os componentes (que já têm fallbacks).
    return {
      elegivel: status !== "INVALID",
      motivos,
      status
    };
 }

/**
 * Versão simplificada (booleana) para uso em filtros rápidos.
 */
export function checkColecaoElegivel(colecao: ColecaoElegibilidadeRaw): boolean {
  return isColecaoElegivelParaHome(colecao).elegivel;
}