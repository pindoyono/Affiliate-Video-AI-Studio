import { create } from 'zustand';

interface Video {
  id: string;
  title: string;
  status: string;
  outputUrl?: string;
  productId: string;
}

interface VideoState {
  videos: Video[];
  selectedVideo: Video | null;
  setVideos: (videos: Video[]) => void;
  setSelectedVideo: (video: Video | null) => void;
  updateVideoStatus: (id: string, status: string, outputUrl?: string) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videos: [],
  selectedVideo: null,
  setVideos: (videos) => set({ videos }),
  setSelectedVideo: (selectedVideo) => set({ selectedVideo }),
  updateVideoStatus: (id, status, outputUrl) =>
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === id ? { ...v, status, ...(outputUrl ? { outputUrl } : {}) } : v
      ),
    })),
}));
