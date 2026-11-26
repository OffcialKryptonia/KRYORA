"use client";

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { supabase, supabaseConfigured } from "../../src/lib/supabase/client";
import {
  ArrowLeft, LayoutDashboard, UserRound, SlidersHorizontal, Bookmark, Compass,
  History, ShieldCheck, LogOut, Camera, Save, ChevronRight, Settings2,
} from "lucide-react";

type Profile = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; bio: string | null };
type Section = "overview" | "profile" | "preferences" | "security";
const usernamePattern = /^[A-Za-z0-9_]{3,20}$/;

export default function AccountPage() {
  const [section, setSection] = useState<Section>("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [watchlistCount, setWatchlistCount] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [preferences, setPreferences] = useState({ preferred_language: "en", audio_language: "en", subtitle_language: "en", autoplay: true, mature_content_enabled: false });

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { if (alive) { setMessage("Supabase environment variables are missing."); setBusy(false); } return; }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) { window.location.replace("/auth?next=/account"); return; }
      const user = data.user;
      const [profileResult, prefsResult, watchResult, historyResult] = await Promise.all([
        supabase.from("profiles").select("id,display_name,username,avatar_url,bio").eq("id", user.id).maybeSingle(),
        supabase.from("user_preferences").select("preferred_language,audio_language,subtitle_language,autoplay,mature_content_enabled").eq("user_id", user.id).maybeSingle(),
        supabase.from("watchlist_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("viewing_history").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (!alive) return;
      if (profileResult.error) setMessage(profileResult.error.message);
      setEmail(user.email ?? "");
      setProfile((profileResult.data as Profile | null) ?? { id: user.id, display_name: "", username: "", avatar_url: "", bio: "" });
      if (prefsResult.data) setPreferences((current) => ({ ...current, ...prefsResult.data }));
      setWatchlistCount(watchResult.count ?? 0);
      setHistoryCount(historyResult.count ?? 0);
      setBusy(false);
    }
    void load();
    return () => { alive = false; };
  }, []);

  function changeUsername(value: string) {
    setProfile((current) => current ? { ...current, username: value } : current);
    setUsernameError(value && !usernamePattern.test(value) ? "Use 3–20 letters, numbers or underscores." : "");
  }
  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !supabase || !profile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Choose a JPG, PNG or WebP image."); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage("Avatar must be 2 MB or smaller."); return; }
    setUploading(true); setMessage("");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = profile.id + "/" + crypto.randomUUID() + "." + ext;
    const { error } = await supabase.storage.from("kryora-avatars").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setMessage(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("kryora-avatars").getPublicUrl(path);
    setProfile({ ...profile, avatar_url: data.publicUrl });
    setUploading(false); setMessage("Avatar uploaded. Save your profile to apply it.");
  }
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !profile) return;
    const username = (profile.username ?? "").trim();
    if (username && !usernamePattern.test(username)) { setUsernameError("Use 3–20 letters, numbers or underscores."); return; }
    setSaving(true); setMessage("");
    const { error } = await supabase.from("profiles").update({
      display_name: (profile.display_name ?? "").trim(), username: username || null,
      bio: (profile.bio ?? "").trim(), avatar_url: profile.avatar_url || null,
    }).eq("id", profile.id);
    setMessage(error ? (error.code === "23505" ? "That username is already taken. Please choose another." : error.message) : "Profile saved successfully.");
    setSaving(false);
  }
  async function savePreferences() {
    if (!supabase) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("user_preferences").upsert({ user_id: user.id, ...preferences }, { onConflict: "user_id" });
    setMessage(error ? error.message : "Account settings saved.");
    setSaving(false);
  }
  async function logout() {
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/");
  }

  const displayName = profile?.display_name?.trim() || profile?.username || email.split("@")[0] || "KRYORA member";
  const initial = displayName.slice(0, 1).toUpperCase();
  const nav = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "profile" as const, label: "Profile details", icon: UserRound },
    { id: "preferences" as const, label: "Preferences", icon: SlidersHorizontal },
  ];
  return (
    <main className="account-dashboard">
      <header className="account-topbar">
        <Link href="/" className="account-brand"><span className="auth-mark">K</span><span>KRYORA</span></Link>
        <Link href="/" className="account-back"><ArrowLeft size={16}/> Back to discover</Link>
      </header>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-sidebar-heading">YOUR SPACE</div>
          <div className="account-mini-profile">
            <div className="account-mini-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initial}</div>
            <div><strong>{busy ? "Loading…" : displayName}</strong><small>{profile?.username ? "@" + profile.username : "KRYORA member"}</small></div>
          </div>
          <nav className="account-nav" aria-label="Account navigation">
            {nav.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={section === id ? "active" : ""} onClick={() => { setSection(id); setMessage(""); }}><Icon size={17}/>{label}</button>)}
            <Link href="/for-you"><Compass size={17}/> For you</Link>
            <Link href="/watchlist"><Bookmark size={17}/> Watchlist <span className="account-nav-count">{watchlistCount ?? "—"}</span></Link>
            <Link href="/history"><History size={17}/> Viewing history <span className="account-nav-count">{historyCount ?? "—"}</span></Link>
            <button type="button" className={section === "security" ? "active" : ""} onClick={() => { setSection("security"); setMessage(""); }}><ShieldCheck size={17}/> Security</button>
          </nav>
          <button type="button" className="account-signout" onClick={logout}><LogOut size={17}/> Sign out</button>
        </aside>

        <section className="account-main">
          <div className="account-page-heading"><div><p className="auth-eyebrow">KRYORA MEMBER AREA</p><h1>{section === "overview" ? "Your dashboard" : section === "profile" ? "Profile details" : section === "preferences" ? "Viewing preferences" : "Account security"}</h1><p>Manage your KRYORA identity and entertainment experience.</p></div><span className="account-status"><span/> ACCOUNT</span></div>
          {busy ? <div className="account-panel account-loading">Loading your account…</div> : !profile ? <div className="auth-message">{message || "Unable to load profile."}</div> : <>
            {section === "overview" && <div className="account-overview">
              <article className="account-welcome-panel">
                <div className="account-welcome-copy"><span className="account-welcome-label">WELCOME BACK</span><h2>{displayName}</h2><p>Your personal space for everything you watch and discover on KRYORA.</p><button type="button" onClick={() => setSection("profile")}>Edit profile <ChevronRight size={16}/></button></div>
                <div className="account-welcome-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile"/> : initial}</div>
              </article>
              <div className="account-stat-grid">
                <Link href="/watchlist" className="account-stat-card"><span><Bookmark size={18}/></span><strong>{watchlistCount ?? "—"}</strong><small>Saved titles</small><em>Open watchlist <ChevronRight size={13}/></em></Link>
                <Link href="/history" className="account-stat-card"><span><History size={18}/></span><strong>{historyCount ?? "—"}</strong><small>History entries</small><em>View history <ChevronRight size={13}/></em></Link>
              </div>
              <div className="account-quick-grid">
                <button type="button" onClick={() => setSection("profile")}><UserRound/><span><b>Personal information</b><small>Update your name, username, avatar and bio.</small></span><ChevronRight/></button>
                <button type="button" onClick={() => setSection("preferences")}><Settings2/><span><b>Playback preferences</b><small>Language, subtitles and autoplay settings.</small></span><ChevronRight/></button>
                <button type="button" onClick={() => setSection("security")}><ShieldCheck/><span><b>Security & sign-in</b><small>Review your sign-in email and account access.</small></span><ChevronRight/></button>
              </div>
            </div>}

            {section === "profile" && <div className="account-panel">
              <div className="account-panel-title"><div><h2>Personal information</h2><p>Your public KRYORA profile details.</p></div></div>
              <div className="account-avatar-row"><div className="account-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="Your avatar"/> : <span>{initial}</span>}</div><label className="avatar-upload"><Camera size={16}/>{uploading ? "Uploading…" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={uploading}/></label><small>JPG, PNG or WebP · max 2 MB</small></div>
              <form className="auth-form account-form" onSubmit={saveProfile}>
                <label>Display name<input value={profile.display_name ?? ""} onChange={e => setProfile({ ...profile, display_name: e.target.value })} maxLength={60} placeholder="Your display name"/></label>
                <label>Username<input value={profile.username ?? ""} onChange={e => changeUsername(e.target.value)} placeholder="your_username" maxLength={20}/>{usernameError && <small className="field-error">{usernameError}</small>}<small>3–20 characters; letters, numbers and underscores. Must be unique.</small></label>
                <label>Bio<textarea value={profile.bio ?? ""} onChange={e => setProfile({ ...profile, bio: e.target.value })} rows={4} maxLength={240} placeholder="Tell us a little about yourself"/></label>
                <label>Email address<input value={email} disabled readOnly/></label>
                <button className="auth-submit" disabled={saving || !!usernameError}><Save size={16}/>{saving ? "Saving…" : "Save profile"}</button>
              </form>
            </div>}

            {section === "preferences" && <div className="account-panel">
              <div className="account-panel-title"><div><h2>Playback & discovery</h2><p>Choose how KRYORA presents and plays content.</p></div></div>
              <div className="account-preference-grid">
                <label>Preferred language<select value={preferences.preferred_language} onChange={e => setPreferences({ ...preferences, preferred_language: e.target.value })}><option value="en">English</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option></select></label>
                <label>Preferred audio<select value={preferences.audio_language} onChange={e => setPreferences({ ...preferences, audio_language: e.target.value })}><option value="en">English</option><option value="ja">Japanese</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option></select></label>
                <label>Preferred subtitles<select value={preferences.subtitle_language} onChange={e => setPreferences({ ...preferences, subtitle_language: e.target.value })}><option value="en">English</option><option value="ja">Japanese</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option></select></label>
              </div>
              <label className="account-toggle"><input type="checkbox" checked={preferences.autoplay} onChange={e => setPreferences({ ...preferences, autoplay: e.target.checked })}/> Enable autoplay when supported</label>
              <label className="account-toggle"><input type="checkbox" checked={preferences.mature_content_enabled} onChange={e => setPreferences({ ...preferences, mature_content_enabled: e.target.checked })}/> Allow mature catalogue titles</label>
              <button className="auth-submit account-save-settings" type="button" onClick={savePreferences} disabled={saving}><Save size={16}/>{saving ? "Saving…" : "Save preferences"}</button>
            </div>}

            {section === "security" && <div className="account-panel">
              <div className="account-panel-title"><div><h2>Sign-in & security</h2><p>Account identity and session controls.</p></div></div>
              <div className="account-security-row"><span><ShieldCheck/></span><div><b>Verified account session</b><small>Your account data is protected by Supabase authentication and row-level security.</small></div></div>
              <label className="account-security-email">Sign-in email<input value={email} readOnly disabled/></label>
              <p className="account-security-note">To change your password, use the password recovery option on the sign-in screen.</p>
              <Link className="account-recovery-link" href="/auth">Open sign-in & recovery <ChevronRight size={15}/></Link>
              <button className="account-danger-button" type="button" onClick={logout}><LogOut size={16}/> Sign out of this device</button>
            </div>}
          </>}
          {message && <div className="auth-message account-feedback" role="status">{message}</div>}
          <footer className="account-main-footer">KRYORA · A PRODUCT OF KRYPTONIA</footer>
        </section>
      </div>
    </main>
  );
}
