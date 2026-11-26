"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../src/lib/supabase/client";
import {
  Activity, ArrowLeft, Bookmark, Film, LayoutDashboard, LogOut, Search,
  Settings, ShieldCheck, Users, History, Save, RefreshCw, AlertTriangle,
} from "lucide-react";

type UserRow = { id: string; display_name: string | null; username: string | null; created_at: string };
type SettingRow = { key: string; value: unknown; description: string | null; updated_at: string };
type Props = {
  email: string; role: string;
  stats: { members: number; savedTitles: number; historyEntries: number };
  initialUsers: UserRow[]; initialSettings: SettingRow[]; loadWarning: string;
};
type Tab = "overview" | "users" | "catalogue" | "settings" | "audit";
const defaultSettings = [
  { key: "maintenance_mode", label: "Maintenance mode", description: "Temporarily show a maintenance notice to visitors.", value: false },
  { key: "registration_enabled", label: "New registrations", description: "Allow new members to create KRYORA accounts.", value: true },
  { key: "mature_content_enabled", label: "Mature catalogue", description: "Allow mature titles to appear in discovery.", value: false },
];

export default function AdminDashboard({ email, role, stats, initialUsers, initialSettings, loadWarning }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [users] = useState(initialUsers);
  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    const saved = Object.fromEntries(initialSettings.map((item) => [item.key, item.value]));
    return Object.fromEntries(defaultSettings.map((item) => [item.key, typeof saved[item.key] === "boolean" ? saved[item.key] as boolean : item.value]));
  });
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [audit, setAudit] = useState<Array<{ action: string; resource: string; created_at: string }>>([]);
  const filteredUsers = useMemo(() => users.filter((user) => (user.display_name || user.username || "").toLowerCase().includes(query.toLowerCase())), [users, query]);

  async function saveSettings() {
    if (!supabase) { setMessage("Supabase is not configured."); return; }
    setSaving(true); setMessage("");
    const rows = defaultSettings.map((item) => ({ key: item.key, value: settings[item.key], description: item.description, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("kryora_platform_settings").upsert(rows, { onConflict: "key" });
    if (error) { setMessage(error.message); setSaving(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("kryora_admin_audit_logs").insert(rows.map((row) => ({ actor_id: user.id, action: "updated_setting", resource: row.key, details: { value: row.value } })));
    }
    setMessage("Platform settings saved.");
    setSaving(false);
  }

  async function loadAudit() {
    if (!supabase) return;
    const { data, error } = await supabase.from("kryora_admin_audit_logs").select("action,resource,created_at").order("created_at", { ascending: false }).limit(50);
    if (error) setMessage(error.message); else setAudit(data ?? []);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/");
  }

  const nav: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Members", icon: Users },
    { id: "catalogue", label: "Catalogue", icon: Film },
    { id: "settings", label: "Platform settings", icon: Settings },
    { id: "audit", label: "Audit log", icon: Activity },
  ];

  return <main className="k-admin">
    <header className="k-admin-top">
      <Link href="/" className="k-admin-brand"><span className="auth-mark">K</span><span>KRYORA <small>CONTROL ROOM</small></span></Link>
      <div className="k-admin-top-actions"><span><ShieldCheck size={15}/> {role.replaceAll("_", " ")}</span><Link href="/" aria-label="Back to KRYORA"><ArrowLeft size={16}/> Back to site</Link></div>
    </header>
    <div className="k-admin-layout">
      <aside className="k-admin-sidebar">
        <div className="k-admin-section-label">MANAGEMENT</div>
        {nav.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); if (id === "audit") void loadAudit(); }} type="button"><Icon size={17}/>{label}</button>)}
        <div className="k-admin-sidebar-bottom"><span className="k-admin-avatar">{(email[0] || "A").toUpperCase()}</span><span><b>{email}</b><small>Administrator</small></span><button onClick={signOut} aria-label="Sign out" type="button"><LogOut size={16}/></button></div>
      </aside>
      <section className="k-admin-main">
        <div className="k-admin-heading"><div><p className="auth-eyebrow">KRYORA ADMINISTRATION</p><h1>{nav.find((item) => item.id === tab)?.label}</h1><p>Manage your platform and monitor member activity.</p></div><span className="k-admin-secure"><ShieldCheck size={15}/> Protected session</span></div>
        {loadWarning && <div className="k-admin-alert"><AlertTriangle size={16}/>{loadWarning}</div>}
        {message && <div className="k-admin-message" role="status">{message}</div>}
        {tab === "overview" && <>
          <div className="k-admin-stat-grid">
            <article><span><Users/></span><small>Total members</small><strong>{stats.members.toLocaleString()}</strong><em>Registered profiles</em></article>
            <article><span><Bookmark/></span><small>Saved titles</small><strong>{stats.savedTitles.toLocaleString()}</strong><em>Across member watchlists</em></article>
            <article><span><History/></span><small>Viewing records</small><strong>{stats.historyEntries.toLocaleString()}</strong><em>Member viewing history</em></article>
          </div>
          <div className="k-admin-panel"><div className="k-admin-panel-head"><div><h2>Platform health</h2><p>Connected services and operational readiness.</p></div><span className="k-admin-status">Dashboard online</span></div>
            <div className="k-admin-health-row"><span><span className="k-admin-dot"/> Supabase authentication & database</span><b>Connected</b></div>
            <div className="k-admin-health-row"><span><span className="k-admin-dot"/> Member profiles & personalization</span><b>Connected</b></div>
            <div className="k-admin-health-row"><span><span className="k-admin-dot k-admin-dot-warn"/> Authorized playback providers</span><b>Not configured</b></div>
            <p className="k-admin-note">TMDB and AniList provide catalogue metadata. They are not licensed playback providers.</p>
          </div>
        </>}
        {tab === "users" && <div className="k-admin-panel"><div className="k-admin-panel-head"><div><h2>Member directory</h2><p>Recent member profiles. Private email addresses are not exposed here.</p></div><span className="k-admin-count">{users.length} shown</span></div><label className="k-admin-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search display names or usernames"/></label><div className="k-admin-table-wrap"><table><thead><tr><th>Member</th><th>Username</th><th>Joined</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td>{user.display_name || "KRYORA member"}</td><td>@{user.username || "—"}</td><td>{new Date(user.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{filteredUsers.length === 0 && <p className="k-admin-empty">No matching members.</p>}</div></div>}
        {tab === "catalogue" && <div className="k-admin-panel"><div className="k-admin-panel-head"><div><h2>Catalogue providers</h2><p>Metadata integrations currently powering discovery.</p></div></div><div className="k-admin-provider"><b>TMDB</b><span>Movies and series metadata</span><em>Server environment credential</em></div><div className="k-admin-provider"><b>AniList</b><span>Anime metadata and discovery</span><em>Public GraphQL endpoint</em></div><div className="k-admin-provider"><b>Playback sources</b><span>Authorized video delivery</span><em>Awaiting licensed provider integration</em></div><p className="k-admin-note">API credentials are intentionally not editable or displayed in this browser dashboard. Configure secrets in Vercel Environment Variables.</p></div>}
        {tab === "settings" && <div className="k-admin-panel"><div className="k-admin-panel-head"><div><h2>Platform controls</h2><p>These settings are stored in the KRYORA database.</p></div></div><div className="k-admin-settings">{defaultSettings.map((item) => <label key={item.key}><span><b>{item.label}</b><small>{item.description}</small></span><input type="checkbox" checked={settings[item.key]} onChange={(e) => setSettings((current) => ({ ...current, [item.key]: e.target.checked }))}/></label>)}</div><button className="k-admin-save" onClick={saveSettings} disabled={saving}><Save size={16}/>{saving ? "Saving…" : "Save settings"}</button></div>}
        {tab === "audit" && <div className="k-admin-panel"><div className="k-admin-panel-head"><div><h2>Administrator activity</h2><p>Recent configuration changes recorded by the dashboard.</p></div><button className="k-admin-refresh" onClick={() => void loadAudit()}><RefreshCw size={15}/> Refresh</button></div>{audit.length ? <div className="k-admin-table-wrap"><table><thead><tr><th>Action</th><th>Resource</th><th>Date</th></tr></thead><tbody>{audit.map((item, i) => <tr key={i}><td>{item.action}</td><td>{item.resource}</td><td>{new Date(item.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="k-admin-empty">No administrator actions recorded yet.</p>}</div>}
      </section>
    </div>
    <footer className="k-admin-footer">KRYORA · SECURE ADMINISTRATION · A PRODUCT OF KRYPTONIA</footer>
  </main>;
}
