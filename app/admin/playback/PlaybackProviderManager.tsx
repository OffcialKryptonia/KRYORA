"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MovieBoxStatus = { endpointConfigured: boolean; endpointValid: boolean; credentialConfigured: boolean; readyForPartnerConnection: boolean; adapterConnected: boolean; playbackEnabled: boolean; note: string };

type Provider = {
  id: string; provider_key: string; display_name: string; adapter_key: string;
  enabled: boolean; priority: number; supported_protocols: string[]; capabilities: Record<string, boolean>;
};

export default function PlaybackProviderManager({ role }: { role: string }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerKey, setProviderKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [adapterKey, setAdapterKey] = useState("");
  const [protocol, setProtocol] = useState("hls");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading provider registry…");
  const [movieBox, setMovieBox] = useState<MovieBoxStatus | null>(null);
  const [movieBoxMessage, setMovieBoxMessage] = useState("Checking MovieBox configuration…");

  async function load() {
    const response = await fetch("/api/admin/playback/providers", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not load providers."); return; }
    setProviders(data.providers ?? []); setMessage("");
    const statusResponse = await fetch("/api/admin/playback/providers/moviebox/status", { cache: "no-store" });
    const statusData = await statusResponse.json();
    if (statusResponse.ok) { setMovieBox(statusData); setMovieBoxMessage(""); }
    else setMovieBoxMessage(statusData.error || "Could not check MovieBox configuration.");
  }
  useEffect(() => { void load(); }, []);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/admin/playback/providers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerKey, displayName, adapterKey, protocols: [protocol] }),
    });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "Provider registration failed.");
    else { setProviderKey(""); setDisplayName(""); setAdapterKey(""); setMessage("Provider registered in disabled state. Integration and rights checks are still required."); await load(); }
    setBusy(false);
  }

  return <main className="k-admin">
    <header className="k-admin-top"><Link href="/admin" className="k-admin-brand"><span className="auth-mark">K</span><span>KRYORA <small>CONTROL ROOM</small></span></Link><div className="k-admin-top-actions"><span>{role.replaceAll("_", " ")}</span><Link href="/admin">Back to admin</Link></div></header>
    <section className="k-admin-main" style={{ maxWidth: 1050, margin: "0 auto" }}>
      <div className="k-admin-heading"><div><p className="auth-eyebrow">PLAYBACK INFRASTRUCTURE</p><h1>Provider registry</h1><p>Register authorised playback partners and track integration readiness.</p></div><span className="k-admin-secure">Protected session</span></div>
      <div className="k-admin-alert">Providers are registered disabled by default. KRYORA will not issue or expose a video URL until a verified provider adapter performs a secure, server-side resolution.</div>
      {message && <div className="k-admin-message" role="status">{message}</div>}
      <div className="k-admin-panel" style={{ marginBottom: 18 }}>
        <div className="k-admin-panel-head"><div><h2>MovieBox connection</h2><p>Secure configuration check. Secrets are never displayed.</p></div><button className="k-admin-refresh" onClick={() => void load()}>Check again</button></div>
        {movieBoxMessage ? <p className="k-admin-message" role="status">{movieBoxMessage}</p> : movieBox && <><p>{movieBox.endpointConfigured ? (movieBox.endpointValid ? "HTTPS endpoint configured" : "Endpoint URL is invalid — HTTPS is required") : "Partner API endpoint not configured"}</p><p>{movieBox.credentialConfigured ? "Partner credential configured" : "Partner credential not configured"}</p><p><b>{movieBox.readyForPartnerConnection ? "Configuration ready for adapter connection" : "Waiting for partner API configuration"}</b></p><p className="k-admin-empty">{movieBox.note}</p></>}
      </div>
      <div className="k-admin-panel">
        <div className="k-admin-panel-head"><div><h2>Register a provider</h2><p>Use the adapter identifier that will be implemented against the provider’s official API.</p></div></div>
        <form onSubmit={register} className="k-playback-form">
          <label>Provider key<input required minLength={2} maxLength={40} pattern="[a-zA-Z0-9_-]+" value={providerKey} onChange={e => setProviderKey(e.target.value)} placeholder="e.g. licensed_partner" /></label>
          <label>Display name<input required maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Provider name" /></label>
          <label>Adapter key<input required minLength={2} maxLength={40} pattern="[a-zA-Z0-9_-]+" value={adapterKey} onChange={e => setAdapterKey(e.target.value)} placeholder="e.g. partner_api_v1" /></label>
          <label>Protocol<select value={protocol} onChange={e => setProtocol(e.target.value)}><option value="hls">HLS</option><option value="dash">MPEG-DASH</option><option value="file">Progressive file</option></select></label>
          <button className="k-admin-save" disabled={busy}>{busy ? "Registering…" : "Register provider (disabled)"}</button>
        </form>
      </div>
      <div className="k-admin-panel" style={{ marginTop: 18 }}>
        <div className="k-admin-panel-head"><div><h2>Registered providers</h2><p>Provider credentials are not stored or displayed in this registry screen.</p></div><button className="k-admin-refresh" onClick={() => void load()}>Refresh</button></div>
        {providers.length === 0 ? <p className="k-admin-empty">No playback providers registered.</p> : providers.map(provider => <article className="k-admin-provider" key={provider.id}><b>{provider.display_name}</b><span>{provider.provider_key} · {provider.adapter_key}</span><em>{provider.supported_protocols.join(", ").toUpperCase()} · {provider.enabled ? "Enabled" : "Disabled"} · Integration pending</em></article>)}
      </div>
    </section>
  </main>;
}
