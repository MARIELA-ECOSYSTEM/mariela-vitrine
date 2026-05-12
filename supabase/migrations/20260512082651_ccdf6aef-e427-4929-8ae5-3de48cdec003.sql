-- Adiciona flags de contexto editorial para imagens de produtos

-- Criar a tabela de imagens se não existir
CREATE TABLE IF NOT EXISTS public.produto_cor_imagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_cor_id UUID NOT NULL, -- Referência à cor do produto
    url_thumb TEXT,
    url_full TEXT,
    ordem INTEGER DEFAULT 0,
    is_principal BOOLEAN DEFAULT false,
    is_monte_look BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que as colunas existam caso a tabela já exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produto_cor_imagens' AND column_name='is_principal') THEN
        ALTER TABLE public.produto_cor_imagens ADD COLUMN is_principal BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produto_cor_imagens' AND column_name='is_monte_look') THEN
        ALTER TABLE public.produto_cor_imagens ADD COLUMN is_monte_look BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Triggers para garantir exclusividade por cor (apenas uma Principal e uma Monte Look por produto_cor_id)
CREATE OR REPLACE FUNCTION public.fn_ensure_single_context_image()
RETURNS TRIGGER AS $$
BEGIN
    -- Se estiver marcando como principal, desmarca outras da mesma cor
    IF NEW.is_principal = true THEN
        UPDATE public.produto_cor_imagens 
        SET is_principal = false 
        WHERE produto_cor_id = NEW.produto_cor_id AND id != NEW.id;
    END IF;

    -- Se estiver marcando como monte_look, desmarca outras da mesma cor
    IF NEW.is_monte_look = true THEN
        UPDATE public.produto_cor_imagens 
        SET is_monte_look = false 
        WHERE produto_cor_id = NEW.produto_cor_id AND id != NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_context_image ON public.produto_cor_imagens;
CREATE TRIGGER trg_single_context_image
BEFORE INSERT OR UPDATE ON public.produto_cor_imagens
FOR EACH ROW
EXECUTE FUNCTION public.fn_ensure_single_context_image();

-- RLS
ALTER TABLE public.produto_cor_imagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de imagens de produtos" 
ON public.produto_cor_imagens FOR SELECT USING (true);
