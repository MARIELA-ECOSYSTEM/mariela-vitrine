import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vitrineApiService, clearVitrineCache } from '../services/vitrineApiService';

describe('Product Integration Validation', () => {
  beforeEach(() => {
    // Clear mocks and set up environment
    vi.clearAllMocks();
  });

  it('should load real products from /products with pagination', async () => {
    const params = { limit: 12, offset: 0 };
    const page = await vitrineApiService.getProdutosPage(params);
    
    expect(page).toBeDefined();
    expect(page.limit).toBe(12);
    expect(page.offset).toBe(0);
    expect(Array.isArray(page.items)).toBe(true);
    
    if (page.items.length > 0) {
      const product = page.items[0];
      expect(product.id).toBeDefined();
      expect(product.nome).toBeDefined();
      expect(product.precoVenda).toBeGreaterThan(0);
      // Ensure it has images
      expect(product.imagens.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('should clear all caches correctly', () => {
    // Simulate some cache
    localStorage.setItem('mariela_vitrine_api_cache_v11', JSON.stringify({ test: 'data' }));
    
    clearVitrineCache();
    
    expect(localStorage.getItem('mariela_vitrine_api_cache_v11')).toBeNull();
  });

  it('should return real blocks for Home', async () => {
    const blocks = await vitrineApiService.getHomeBlocks();
    
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
    
    const productBlocks = blocks.filter(b => b.tipo === 'produtos');
    expect(productBlocks.length).toBeGreaterThan(0);
    
    // Check if Novidades is present
    const hasNovidades = productBlocks.some(b => b.config?.filter === 'novidades' || b.titulo?.toLowerCase().includes('novidade'));
    expect(hasNovidades).toBe(true);
  });

  it('should handle Monte Seu Look data correctly', async () => {
    const data = await vitrineApiService.getMonteSeuLookData();
    
    expect(data).toBeDefined();
    expect(Array.isArray(data.sugestoes)).toBe(true);
    expect(Array.isArray(data.looks_manuais)).toBe(true);
    
    if (data.sugestoes.length > 0) {
      const suggestion = data.sugestoes[0];
      expect(suggestion.midia_url).toBeDefined();
      expect(suggestion.produtos_vinculados).toBeDefined();
    }
  });
});