'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { knowledgeApi } from '@/lib/api';
import { Plus, BookOpen, Search, Trash2 } from 'lucide-react';

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', content: '', category: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge'],
    queryFn: () => knowledgeApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => knowledgeApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      setShowForm(false);
      setForm({ title: '', content: '', category: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge'] }),
  });

  const searchMutation = useMutation({
    mutationFn: (q: string) => knowledgeApi.search(q),
    onSuccess: (res) => setSearchResults(res.data.data || []),
  });

  const entries = data?.data?.data || [];

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMutation.mutate(searchQuery)}
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Semantic search (press Enter)..."
            />
          </div>
          <button
            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            className="text-gray-500 text-sm px-3 py-2 hover:text-gray-900"
          >
            Clear
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">New Knowledge Entry</h2>
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Title..."
              />
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Category (optional)..."
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Content..."
                rows={5}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.title || !form.content || createMutation.isPending}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Search Results</h2>
            <div className="space-y-3">
              {searchResults.map((r: any) => (
                <div key={r.id} className="bg-purple-50 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-purple-900">{r.title}</h3>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                      {Math.round((r.score || 0) * 100)}% match
                    </span>
                  </div>
                  {r.category && <p className="text-xs text-purple-500 mt-1">{r.category}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow-sm">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
            <p>No knowledge entries yet. Add content to power your AI video scripts!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry: any) => (
              <div key={entry.id} className="bg-white rounded-xl shadow-sm p-5 flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{entry.title}</h3>
                  {entry.category && <p className="text-sm text-gray-500 mt-0.5">{entry.category}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(entry.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(entry.id)}
                  className="text-gray-400 hover:text-red-500 ml-4"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
