'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { productsApi } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Star } from 'lucide-react';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id),
  });

  const product = data?.data?.data;

  return (
    <AppLayout>
      <div>
        <Link href="/products" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Products
        </Link>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : product ? (
          <div className="bg-white rounded-xl shadow-sm p-8 max-w-2xl">
            {product.imageUrl && (
              <img src={product.imageUrl} alt={product.title} className="w-full h-64 object-cover rounded-lg mb-6" />
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.title}</h1>
            <p className="text-sm text-gray-500 mb-4">{product.platform}</p>
            {product.description && <p className="text-gray-600 mb-6">{product.description}</p>}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {product.price && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-xl font-bold text-purple-600">${product.price}</p>
                </div>
              )}
              {product.rating && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    <p className="text-xl font-bold text-yellow-600">{product.rating}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {product.affiliateUrl && (
                <a
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  <ExternalLink size={14} /> Affiliate Link
                </a>
              )}
              <Link
                href={`/studio?productId=${product.id}`}
                className="flex items-center gap-2 border border-purple-600 text-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50"
              >
                Create Video
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Product not found</p>
        )}
      </div>
    </AppLayout>
  );
}
