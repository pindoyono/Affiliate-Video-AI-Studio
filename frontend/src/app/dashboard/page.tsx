'use client';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { videosApi, productsApi, trendsApi } from '@/lib/api';
import { Video, Package, TrendingUp, PlayCircle } from 'lucide-react';

export default function DashboardPage() {
  const { data: videosData } = useQuery({ queryKey: ['videos'], queryFn: () => videosApi.list() });
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });
  const { data: trendsData } = useQuery({ queryKey: ['trends'], queryFn: () => trendsApi.list() });

  const videos = videosData?.data?.data || [];
  const products = productsData?.data?.data || [];
  const trends = trendsData?.data?.data || [];

  const stats = [
    { label: 'Total Videos', value: videos.length, icon: Video, color: 'text-purple-600 bg-purple-50' },
    { label: 'Products', value: products.length, icon: Package, color: 'text-blue-600 bg-blue-50' },
    { label: 'Trends Tracked', value: trends.length, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Videos Rendered', value: videos.filter((v: any) => v.status === 'COMPLETED').length, icon: PlayCircle, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <AppLayout>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Videos</h2>
          {videos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Video size={48} className="mx-auto mb-3 opacity-30" />
              <p>No videos yet. Head to the Studio to create your first video!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.slice(0, 5).map((video: any) => (
                <div key={video.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{video.title}</p>
                    <p className="text-sm text-gray-500">{video.product?.title}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    video.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    video.status === 'RENDERING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {video.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
