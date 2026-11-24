import { create } from 'zustand'

interface CartDrawerState {
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

/**
 * Yalnızca sepet çekmecesinin (CartDrawer) açık/kapalı UI durumunu yönetir.
 * Sepet ürün verileri tek kaynak olarak `lib/cart.ts` üzerinden yönetilir.
 */
export const useCartStore = create<CartDrawerState>()((set) => ({
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
}))
