// Tracking leve e silencioso para a vitrine.
// Não bloqueia UX, falha em silêncio, deduplica por sessão.

const TRACKING_ENDPOINT =
  "https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api/evento";

const SESSION_KEY = "vitrine_session_id";
const UTM_KEY = "vitrine_utm_v1";
const VIEWED_KEY = "vitrine_viewed_products_v1";

export type TipoEvento =
  | "produto_visualizado"
  | "whatsapp_click"
  | "produto_compartilhado";

export interface UtmData {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
}

export interface TrackEventoInput {
  produto_id: string | number;
  tipo_evento: TipoEvento;
  origem?: string;
  utm?: UtmData;
  /** Contexto adicional opcional (ex: cor/tamanho selecionados). */
  contexto?: Record<string, string | number | null | undefined>;
}

function safeStorageGet(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function generateUuid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fallthrough */
  }
  // Fallback simples (RFC4122 v4-ish)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId(): string {
  let id = safeStorageGet(SESSION_KEY);
  if (!id) {
    id = generateUuid();
    safeStorageSet(SESSION_KEY, id);
  }
  return id;
}

let cachedUtm: UtmData | null = null;

export function getUtm(): UtmData {
  if (cachedUtm) return cachedUtm;

  // Tenta capturar da URL primeiro
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl: UtmData = {
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        utm_content: params.get("utm_content"),
      };
      const hasAny = Object.values(fromUrl).some((v) => !!v);
      if (hasAny) {
        cachedUtm = fromUrl;
        safeStorageSet(UTM_KEY, JSON.stringify(fromUrl));
        return fromUrl;
      }
    } catch {
      /* ignore */
    }
  }

  // Senão, recupera do storage
  const stored = safeStorageGet(UTM_KEY);
  if (stored) {
    try {
      cachedUtm = JSON.parse(stored) as UtmData;
      return cachedUtm;
    } catch {
      /* ignore */
    }
  }

  cachedUtm = {};
  return cachedUtm;
}

function readViewedSet(): Set<string> {
  const raw = safeStorageGet(VIEWED_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeViewedSet(set: Set<string>): void {
  try {
    safeStorageSet(VIEWED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

export function trackEvento(input: TrackEventoInput): void {
  try {
    const payload = {
      produto_id: String(input.produto_id),
      tipo_evento: input.tipo_evento,
      origem: input.origem ?? "vitrine",
      session_id: getSessionId(),
      utm: input.utm ?? getUtm(),
      contexto: input.contexto,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify(payload);

    // Preferência: sendBeacon (não bloqueia, sobrevive a navegação)
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      try {
        const blob = new Blob([body], { type: "application/json" });
        const ok = navigator.sendBeacon(TRACKING_ENDPOINT, blob);
        if (ok) return;
      } catch {
        /* fallthrough para fetch */
      }
    }

    // Fallback: fetch keepalive, fire-and-forget
    if (typeof fetch === "function") {
      fetch(TRACKING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        mode: "cors",
      }).catch(() => {
        /* ignora falhas de rede */
      });
    }
  } catch {
    /* nunca lançar para a UI */
  }
}

/** Garante que produto_visualizado dispare apenas 1x por produto na sessão. */
export function trackProdutoVisualizadoOnce(
  produtoId: string | number,
  origem = "detalhe",
): void {
  const key = String(produtoId);
  if (!key) return;
  const viewed = readViewedSet();
  if (viewed.has(key)) return;
  viewed.add(key);
  writeViewedSet(viewed);
  trackEvento({
    produto_id: key,
    tipo_evento: "produto_visualizado",
    origem,
  });
}

export function trackWhatsappClick(
  produtoId: string | number,
  origem = "detalhe",
  contexto?: Record<string, string | number | null | undefined>,
): void {
  trackEvento({
    produto_id: produtoId,
    tipo_evento: "whatsapp_click",
    origem,
    contexto,
  });
}

export function trackProdutoCompartilhado(
  produtoId: string | number,
  origem = "detalhe",
): void {
  trackEvento({
    produto_id: produtoId,
    tipo_evento: "produto_compartilhado",
    origem,
  });
}

// Inicializa UTM o quanto antes (captura na primeira carga)
if (typeof window !== "undefined") {
  try {
    getUtm();
    getSessionId();
  } catch {
    /* ignore */
  }
}
