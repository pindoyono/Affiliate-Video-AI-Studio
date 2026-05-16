'use client';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { videosApi } from '@/lib/api';
import { ArrowLeft, Play, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function VideoDetailPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = use(params);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => videosApi.get(videoId),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.data?.status;
      return status === 'RENDERING' ? 3000 : false;
    },
  });

  const renderMutation = useMutation({
    mutationFn: () => videosApi.render(videoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['video', videoId] }),
  });

  const video = data?.data?.data;

  return (
    <AppLayout>
      <div>
        <Link href="/studio" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Studio
        </Link>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading video...</div>
        ) : video ? (
          <div className="max-w-4xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
                <p className="text-gray-500 mt-1">{video.product?.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  video.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  video.status === 'RENDERING' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {video.status === 'RENDERING' && <RefreshCw size={12} className="inline mr-1 animate-spin" />}
                  {video.status}
                </span>
                {video.status === 'DRAFT' && (
                  <button
                    onClick={() => renderMutation.mutate()}
                    disabled={renderMutation.isPending}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Play size={14} /> Start Render
                  </button>
                )}
              </div>
            </div>

            {video.outputUrl && (
              <div className="bg-black rounded-xl overflow-hidden mb-6 aspect-[9/16] max-w-xs">
                <video src={video.outputUrl} controls className="w-full h-full" />
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scenes ({video.scenes?.length || 0})</h2>
              {video.scenes?.length === 0 ? (
                <p className="text-gray-400 text-sm">No scenes configured</p>
              ) : (
                <div className="space-y-3">
                  {video.scenes?.map((scene: any, i: number) => (
                    <div key={scene.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        {scene.narrationText && <p className="text-sm text-gray-700 mb-1">{scene.narrationText}</p>}
                        {scene.imagePrompt && <p className="text-xs text-gray-400">{scene.imagePrompt}</p>}
                        <p className="text-xs text-gray-400 mt-1">{scene.duration}s</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        scene.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {scene.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Video not found</p>
        )}
      </div>
    </AppLayout>
  );
}
