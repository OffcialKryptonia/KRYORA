import { useMemo } from "react";
import { buildFrameXTVEmbedUrl, type FrameXTVPlaybackRequest } from "../lib/framextv";

interface FrameXTVPlayerProps {
  request: FrameXTVPlaybackRequest;
  title?: string;
}

export function FrameXTVPlayer({ request, title }: FrameXTVPlayerProps) {
  const src = useMemo(
    () => buildFrameXTVEmbedUrl(request),
    [request.media, request.tmdbId, request.season, request.episode],
  );
  return (
    <div className="framextv-player-wrap">
      <iframe
        className="framextv-player"
        src={src}
        title={title ? `FrameXTV player — ${title}` : "FrameXTV video player"}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
