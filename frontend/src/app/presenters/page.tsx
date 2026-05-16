'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { presentersApi } from '@/lib/api';
import { Plus, Users, Trash2 } from 'lucide-react';

export default function PresentersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['presenters'],
    queryFn: () => presentersApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => presentersApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presenters'] });
      setShowForm(false);
      setForm({ name: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => presentersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['presenters'] }),
  });

  const presenters = data?.data?.data || [];

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Presenters</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Plus size={16} /> Add Presenter
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">New Presenter</h2>
            <div className="space-y-4">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Presenter name..."
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Description..."
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.name || createMutation.isPending}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  Create
                </button>
                <button onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : presenters.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow-sm">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p>No presenters yet. Create your first AI presenter!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presenters.map((p: any) => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg mb-3">
                    {p.name[0]}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
