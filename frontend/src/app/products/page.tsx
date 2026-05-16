'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { productsApi } from '@/lib/api';
import { Plus, ExternalLink, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  const importMutation = useMutation({
    mutationFn: (url: string) => productsApi.import({ url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setUrl('');
      setShowForm(false);
    },
  });

  const products = data?.data?.data || [];

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} /> Import Product
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Import from Shopee / TikTok</h2>
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste product URL (Shopee or TikTok Shop)..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => importMutation.mutate(url)}
                disabled={!url || importMutation.isPending}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {importMutation.isPending ? 'Importing...' : 'Import'}
              </button>
              <button onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Cancel</button>
            </div>
            {importMutation.isError && (
              <p className="text-red-500 text-sm mt-2">Import failed. Please check the URL.</p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow-sm">
            <p className="mb-2">No products imported yet.</p>
            <button onClick={() => setShowForm(true)} className="text-purple-600 hover:underline text-sm">
              Import your first product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product: any) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm p-5">
                {product.imageUrl && (
                  <img src={product.imageUrl} alt={product.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                )}
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.title}</h3>
                <p className="text-sm text-gray-500 mb-3">{product.platform}</p>
                <div className="flex items-center justify-between">
                  {product.price && <span className="text-purple-600 font-medium">${product.price}</span>}
                  <div className="flex items-center gap-2">
                    <Link href={`/products/${product.id}`} className="text-xs text-gray-500 hover:text-purple-600">
                      View details
                    </Link>
                    {product.affiliateUrl && (
                      <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} className="text-gray-400 hover:text-purple-600" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
