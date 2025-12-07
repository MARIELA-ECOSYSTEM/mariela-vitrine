import { Produto } from "@/data/products";

interface CartItem {
  product: Produto;
  size: string;
}

interface PendingSyncItem {
  action: 'add' | 'remove' | 'clear';
  productId?: number;
  size?: string;
  timestamp: number;
}

const CART_STORAGE_KEY = 'mariela-cart-offline';
const PENDING_SYNC_KEY = 'mariela-cart-pending-sync';

// Save cart to localStorage
export function saveCartToStorage(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Erro ao salvar carrinho offline:', error);
  }
}

// Load cart from localStorage
export function loadCartFromStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erro ao carregar carrinho offline:', error);
  }
  return [];
}

// Add pending sync action
export function addPendingSync(action: PendingSyncItem): void {
  try {
    const pending = getPendingSync();
    pending.push(action);
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('Erro ao salvar ação pendente:', error);
  }
}

// Get pending sync actions
export function getPendingSync(): PendingSyncItem[] {
  try {
    const stored = localStorage.getItem(PENDING_SYNC_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erro ao carregar ações pendentes:', error);
  }
  return [];
}

// Clear pending sync
export function clearPendingSync(): void {
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
  } catch (error) {
    console.error('Erro ao limpar ações pendentes:', error);
  }
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
