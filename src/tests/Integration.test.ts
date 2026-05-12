import { describe, it, expect, vi } from 'vitest';
import { vitrineApiService } from '../services/vitrineApiService';

describe('Integração Vitrine-API', () => {
  it('deve buscar configurações da loja reais', async () => {
    const config = await vitrineApiService.getConfig();
    expect(config).toBeDefined();
    expect(config.nomeLoja).toContain('Mariela');
  });

  it('deve buscar blocos da home reais', async () => {
    const blocks = await vitrineApiService.getHomeBlocks();
    expect(Array.isArray(blocks)).toBe(true);
    // Deve ter pelo menos o bloco de banner se houver banners na config
    if (blocks.length > 0) {
      expect(['banner', 'produtos', 'colecoes']).toContain(blocks[0].tipo);
    }
  });

  it('deve buscar categorias reais', async () => {
    const categories = await vitrineApiService.getCategorias();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  it('não deve conter dados de mock na resposta de configuração', async () => {
    const config = await vitrineApiService.getConfig();
    // Verifica se não são os valores de fallback padrão definidos no DEFAULT_CONFIG do service
    // DEFAULT_CONFIG has logoUrl: null, etc.
    expect(config.logoUrl).not.toBeNull();
    expect(config.whatsapp).toBeDefined();
  });
});
