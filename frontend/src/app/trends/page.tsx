'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { trendsApi } from '@/lib/api';
import { TrendingUp, RefreshCw } from 'lucide-react';

export default function TrendsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: () => trendsApi.list(),
  });

  const trends = data?.data?.data || [];

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Trend Analysis</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading trends...</div>
        ) : trends.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow-sm">
            <TrendingUp size={48} className="mx-auto mb-3 opacity-30" />
            <p>No trend data yet. Import products and run analysis to see trends.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trends.map((trend: any) => (
              <div key={trend.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{trend.product?.title || 'Product'}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-purple-600">
                      {Math.round((trend.trendScore || 0) * 100)}
                    </span>
                    <span className="text-sm text-gray-500">/ 100</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${(trend.trendScore || 0) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {[
                    { label: 'Sales Growth', value: trend.salesGrowth },
                    { label: 'Engagement', value: trend.engagementGrowth },
                    { label: 'Competition', value: trend.competitionLevel },
                    { label: 'Conversion', value: trend.estimatedConversion },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-gray-500">{label}</p>
                      <p className="font-medium">{value != null ? `${Math.round(value * 100)}%` : 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
