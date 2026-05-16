'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { videosApi, productsApi, aiContentApi } from '@/lib/api';
import { Plus, Wand2, Play, Video } from 'lucide-react';
import Link from 'next/link';

export default function StudioPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', productId: '', mode: 'FACELESS' });
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const { data: videosData } = useQuery({ queryKey: ['videos'], queryFn: () => videosApi.list() });
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });

  const videos = videosData?.data?.data || [];
  const products = productsData?.data?.data || [];

  const generateMutation = useMutation({
    mutationFn: () => aiContentApi.generate({ productId: form.productId, mode: form.mode }),
    onSuccess: (res) => setGeneratedContent(res.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => videosApi.create({
      title: form.title,
      productId: form.productId,
      mode: form.mode,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setShowForm(false);
      setForm({ title: '', productId: '', mode: 'FACELESS' });
      setGeneratedContent(null);
    },
  });

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Video Studio</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} /> New Video
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create New Video</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Video title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">Select product...</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="FACELESS">Faceless</option>
                  <option value="AI_PRESENTER">AI Presenter</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={!form.productId || generateMutation.isPending}
                  className="flex items-center gap-2 border border-purple-600 text-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50 disabled:opacity-50"
                >
                  <Wand2 size={16} />
                  {generateMutation.isPending ? 'Generating...' : 'Generate AI Content'}
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.title || !form.productId || createMutation.isPending}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  Create Video
                </button>
                <button onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>

            {generatedContent && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-3">AI Generated Content</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Title:</span> {generatedContent.title}</p>
                  <p><span className="font-medium">Hook:</span> {generatedContent.hook}</p>
                  <p><span className="font-medium">CTA:</span> {generatedContent.cta}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {videos.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow-sm">
            <Video size={48} className="mx-auto mb-3 opacity-30" />
            <p>No videos yet. Create your first video project!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video: any) => (
              <div key={video.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{video.title}</h3>
                  <span className={`ml-2 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                    video.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    video.status === 'RENDERING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {video.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{video.product?.title}</p>
                <div className="flex gap-2">
                  <Link href={`/studio/${video.id}`} className="flex-1 text-center text-xs bg-purple-50 text-purple-600 px-3 py-2 rounded-lg hover:bg-purple-100">
                    Edit
                  </Link>
                  {video.status === 'DRAFT' && (
                    <button
                      onClick={() => videosApi.render(video.id).then(() => queryClient.invalidateQueries({ queryKey: ['videos'] }))}
                      className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-3 py-2 rounded-lg hover:bg-green-100"
                    >
                      <Play size={12} /> Render
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
