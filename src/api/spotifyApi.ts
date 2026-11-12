import { apiClient } from './client';
import { ApiResponse, SpotifyTrack } from './types';

export const spotifyApi = {
  // Spotify 트랙 검색
  searchTracks: async (query: string) => {
    const res = await apiClient.get<ApiResponse<SpotifyTrack[]>>('/api/spotify/tracks/search', {
      params: { q: query },
    });
    return res.data;
  },
};
