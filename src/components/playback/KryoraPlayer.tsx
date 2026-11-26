"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  mediaType: "movie" | "tv" | "anime";
  catalogueProvider: "tmdb" | "anilist";
  catalogueId: string;
  posterUrl?: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
};

export default function KryoraPlayer(props: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Checking authorised playback availability…");
  const [status, setStatus] = useState<"checking" | "unavailable" | "error">("checking");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      mediaType: props.mediaType, catalogueProvider: props.catalogueProvider,
      catalogueId: props.catalogueId, territory: "NG",
    });
    if (props.seasonNumber !== undefined) params.set("seasonNumber", String(props.seasonNumber));
    if (props.episodeNumber !== undefined) params.set("episodeNumber", String(props.episodeNumber));

    fetch(`/api/playback/resolve?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Playback check failed.");
        setMessage(data.message || "Playback is not available yet.");
        setStatus("unavailable");
      })
      .catch(error => {
        if (error.name !== "AbortError") { setMessage(error.message || "Unable to check playback."); setStatus("error"); }
      });
    return () => controller.abort();
  }, [props.mediaType, props.catalogueProvider, props.catalogueId, props.seasonNumber, props.episodeNumber]);

  async function saveProgress() {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.currentTime) || video.currentTime < 5) return;
    await fetch("/api/playback/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaType: props.mediaType, catalogueProvider: props.catalogueProvider,
        catalogueId: props.catalogueId, title: props.title, posterUrl: props.posterUrl,
        seasonNumber: props.seasonNumber, episodeNumber: props.episodeNumber,
        positionSeconds: video.currentTime, durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
      }),
    }).catch(() => undefined);
  }

  return (
    <section className="kryora-player" aria-label={`Player for ${props.title}`}>
      <div className="kryora-player-screen">
        <video ref={videoRef} controls playsInline preload="metadata" onPause={saveProgress} onEnded={saveProgress} hidden />
        <div className="kryora-player-state" role="status">
          <span className="kryora-player-mark">K</span>
          <strong>{status === "checking" ? "Preparing your experience" : status === "error" ? "Playback check failed" : "Coming soon"}</strong>
          <p>{message}</p>
          {status === "unavailable" && <small>KRYORA only plays video from authorised providers.</small>}
        </div>
      </div>
    </section>
  );
}
