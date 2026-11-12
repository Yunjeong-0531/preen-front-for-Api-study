import React, { useState } from 'react';
import { Music, ExternalLink } from 'lucide-react';

interface SpotifyPlayerWidgetProps {
  trackId: string;
  compact?: boolean;
}

export const SpotifyPlayerWidget: React.FC<SpotifyPlayerWidgetProps> = ({ trackId, compact = true }) => {
  const [hasError, setHasError] = useState(false);

  // trackId가 유효하지 않은 경우 안전 처리
  if (!trackId || trackId.trim() === '') {
    return null;
  }

  const cleanTrackId = trackId.trim().replace(/^spotify:track:/, '');
  const height = compact ? 80 : 152;
  const embedUrl = `https://open.spotify.com/embed/track/${cleanTrackId}?utm_source=generator&theme=0`;
  const spotifyWebUrl = `https://open.spotify.com/track/${cleanTrackId}`;

  return (
    <div
      className="spotify-player-widget"
      style={{
        marginTop: '8px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        background: '#121212',
      }}
    >
      {!hasError ? (
        <iframe
          src={embedUrl}
          width="100%"
          height={height}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={`Spotify Track ${cleanTrackId}`}
          onError={() => setHasError(true)}
          style={{ display: 'block', borderRadius: '12px' }}
        />
      ) : (
        <div
          style={{
            padding: '10px 14px',
            color: '#1db954',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Music size={14} />
            <span>Spotify Track: <code>{cleanTrackId}</code></span>
          </div>
          <a
            href={spotifyWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1db954', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Spotify에서 듣기 <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  );
};
