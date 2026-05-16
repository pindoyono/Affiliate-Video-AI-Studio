import { create } from 'zustand';

interface Product {
  id: string;
  title: string;
  platform: string;
  price?: number;
  rating?: number;
  status: string;
  affiliateUrl?: string;
}

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  selectedProduct: null,
  setProducts: (products) => set({ products }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
}));
