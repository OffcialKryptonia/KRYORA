import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Bell, Bookmark, ChevronDown, Clapperboard, Compass,
  Film, Menu, Play, Search, Sparkles, Tv, X, Star, CalendarDays, Clock,
} from "lucide-react";
import { FrameXTVPlayer } from "./components/FrameXTVPlayer";
import type { FrameXTVPlaybackRequest } from "./lib/framextv";
import {
  getFrameXTVHome, searchFrameXTV, getFrameXTVDetails, getFrameXTVSeason,
  type FrameXTVHome, type FrameXTVDetails, type FrameXTVEpisode,
} from "./lib/framextv-catalogue";
import type { CatalogueTitle, MediaKind } from "./lib/catalogue/types";

type NavItem = "Home" | "Movies" | "Series" | "Anime";
const navItems: NavItem[] = ["Home", "Movies", "Series", "Anime"];
const railForNav: Record<Exclude<NavItem, "Home">, string[]> = {
  Movies: ["trending_movies", "popular_movies", "new_releases", "action_movies", "scifi_movies", "thriller_movies", "comedy_movies"],
  Series: ["popular_tv"],
  Anime: ["popular_anime", "airing_anime"],
};
function playbackFromUrl(): FrameXTVPlaybackRequest | null {
  const p = new URLSearchParams(window.location.search);
  const media = p.get("watch");
  const id = p.get("id") ?? "";
  if ((media !== "movie" && media !== "series") || !/^\d+$/.test(id)) return null;
  if (media === "movie") return { media, tmdbId: id };
  const season = Number(p.get("season"));
  const episode = Number(p.get("episode"));
  return Number.isInteger(season) && Number.isInteger(episode) && season > 0 && episode > 0
    ? { media, tmdbId: id, season, episode } : null;
}
function WatchPage({ request }: { request: FrameXTVPlaybackRequest }) {
  return <main className="watch-page">
    <header className="watch-header"><a className="brand" href="/"><span className="brand-mark">K</span><span className="brand-word">KRYORA</span></a><span className="watch-provider">POWERED BY FRAMEX TV</span></header>
    <div className="watch-content"><a className="watch-back" href="/">← Back to KRYORA</a>
      <div className="watch-heading"><p className="section-overline">NOW PLAYING</p><h1>Continue your story</h1><p>{request.media === "movie" ? "Movie" : `Season ${request.season} · Episode ${request.episode}`} · TMDB ID {request.tmdbId}</p></div>
      <FrameXTVPlayer request={request} />
      <p className="watch-disclaimer">Playback is provided by FrameXTV. Availability depends on the external player and its supported content.</p>
    </div><footer className="watch-footer">KRYORA · A PRODUCT OF KRYPTONIA</footer>
  </main>;
}
function PosterCard({ item, onOpen }: { item: CatalogueTitle; onOpen: (item: CatalogueTitle) => void }) {
  return <button className="poster-card" type="button" onClick={() => onOpen(item)}>
    <span className="poster-image">{item.posterUrl ? <img src={item.posterUrl} alt="" loading="lazy" /> : <span className="poster-placeholder"><Film size={26}/></span>}
      <span className="poster-hover"><Play size={20} fill="currentColor"/></span>
      {item.averageRating !== undefined && <span className="poster-rating"><Star size={11} fill="currentColor"/>{item.averageRating.toFixed(1)}</span>}
    </span>
    <span className="poster-title">{item.title}</span><span className="poster-meta">{item.year ?? "—"} · {item.kind === "series" ? "Series" : item.kind === "anime" ? "Anime" : "Movie"}</span>
  </button>;
}
function App() {
  const [activeNav, setActiveNav] = useState<NavItem>("Home");
  const [home, setHome] = useState<FrameXTVHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogueTitle[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CatalogueTitle | null>(null);
  const [details, setDetails] = useState<FrameXTVDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodes, setEpisodes] = useState<FrameXTVEpisode[]>([]);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [watchRequest, setWatchRequest] = useState<FrameXTVPlaybackRequest | null>(playbackFromUrl);

  useEffect(() => {
    getFrameXTVHome().then(setHome).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load FrameXTV catalogue.")).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return; }
    const handle = window.setTimeout(() => {
      setSearching(true);
      searchFrameXTV(query.trim()).then(setSearchResults).catch((e: unknown) => setDetailError(e instanceof Error ? e.message : "Search failed.")).finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [query]);
  useEffect(() => {
    if (!selected) { setDetails(null); setEpisodes([]); return; }
    setDetailLoading(true); setDetailError("");
    getFrameXTVDetails(selected.providerId, selected.kind).then((data) => {
      setDetails(data); setSeasonNumber(data.seasons.find((s) => s.number > 0)?.number ?? 1);
    }).catch((e: unknown) => setDetailError(e instanceof Error ? e.message : "Unable to load title details.")).finally(() => setDetailLoading(false));
  }, [selected]);
  useEffect(() => {
    if (!details || selected?.kind !== "series") { setEpisodes([]); return; }
    setEpisodeLoading(true);
    getFrameXTVSeason(selected.providerId, seasonNumber).then(setEpisodes).catch(() => setEpisodes([])).finally(() => setEpisodeLoading(false));
  }, [details, selected, seasonNumber]);

  const playbackRequest = watchRequest ?? playbackFromUrl();
  const visibleRails = useMemo(() => {
    if (!home) return [];
    if (activeNav === "Home") return home.rails;
    const allowed = railForNav[activeNav];
    return home.rails.filter((rail) => allowed.includes(rail.key));
  }, [home, activeNav]);
  const hero = home?.hero ?? home?.rails.find((r) => r.key === "trending_movies")?.items[0] ?? null;
  const openTitle = (item: CatalogueTitle) => { setSelected(item); setDetailError(""); };
  const startWatch = (media: "movie" | "series", id: string, season?: number, episode?: number) => {
    const request: FrameXTVPlaybackRequest = { media, tmdbId: id, season, episode };
    setWatchRequest(request);
    const params = new URLSearchParams({ watch: media, id });
    if (season) params.set("season", String(season));
    if (episode) params.set("episode", String(episode));
    window.history.pushState({}, "", `/?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  if (playbackRequest) return <WatchPage request={playbackRequest}/>;

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" onClick={(e) => { e.preventDefault(); setActiveNav("Home"); setSelected(null); }} aria-label="KRYORA home"><span className="brand-mark">K</span><span className="brand-word">KRYORA</span></a>
      <nav className="desktop-nav" aria-label="Main navigation">{navItems.map((item) => <button className={activeNav === item ? "nav-link active" : "nav-link"} key={item} onClick={() => setActiveNav(item)} type="button">{item}</button>)}<button className="nav-link explore-link" type="button" onClick={() => setActiveNav("Home")}>Explore <ChevronDown size={14}/></button></nav>
      <div className="topbar-actions"><button className="icon-button" aria-label="Search" onClick={() => setSearchOpen((v) => !v)} type="button"><Search size={19}/></button><button className="icon-button notification-button" aria-label="Notifications" type="button"><Bell size={19}/></button><button className="profile-button" aria-label="Profile" type="button">K</button><button className="icon-button mobile-menu-trigger" aria-label="Menu" onClick={() => setMobileMenuOpen((v) => !v)} type="button">{mobileMenuOpen ? <X size={21}/> : <Menu size={21}/>}</button></div>
    </header>
    {searchOpen && <section className="search-panel" aria-label="Catalogue search"><Search size={18}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search movies, series, anime..." aria-label="Search titles"/>{searching && <span className="search-hint">Searching…</span>}<button className="icon-button" onClick={() => {setSearchOpen(false);setQuery("");setSearchResults(null);}} aria-label="Close search" type="button"><X size={18}/></button></section>}
    {mobileMenuOpen && <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map((item) => <button key={item} onClick={() => {setActiveNav(item);setMobileMenuOpen(false);}} type="button">{item}</button>)}</nav>}
    {searchResults && <section className="search-results-section"><div className="section-heading"><div><p className="section-overline">FRAMEX TV CATALOGUE</p><h2>Search results</h2></div><button className="text-action" onClick={() => {setQuery("");setSearchResults(null);}} type="button">Clear search <X size={14}/></button></div><div className="poster-grid">{searchResults.map((item) => <PosterCard key={item.id} item={item} onOpen={openTitle}/>)}</div>{searchResults.length === 0 && <p className="empty-state">No titles found for “{query}”.</p>}</section>}
    <section className="hero">
      <div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-grid"/>
      {hero?.backdropUrl && <img className="hero-backdrop" src={hero.backdropUrl} alt="" />}
      <div className="hero-content"><div className="eyebrow"><span className="eyebrow-line"/> THE UNIVERSE OF ENTERTAINMENT</div><p className="hero-kicker">A NEW WAY TO EXPERIENCE STORIES</p>
        <h1>{hero ? <>Discover<br/><span>{hero.title}</span></> : <>Beyond<br/><span>Every Story.</span></>}</h1>
        <p className="hero-copy">{hero?.synopsis || "Your next obsession is out there. Explore movies, unforgettable series, anime and animation in one place."}</p>
        <div className="hero-actions">{hero && <button className="primary-button" type="button" onClick={() => openTitle(hero)}><Compass size={17}/> Explore title <ArrowRight size={16}/></button>}<button className="secondary-button" type="button" onClick={() => setActiveNav("Movies")}><Play size={16}/> Discover movies</button></div>
        <div className="hero-footnote"><Sparkles size={14}/> POWERED BY FRAMEX TV CATALOGUE</div>
      </div><div className="hero-art" aria-hidden="true"><div className="planet-glow"/><div className="planet"><div className="planet-highlight"/><div className="planet-ring"/></div><div className="star star-a"/><div className="star star-b"/><div className="star star-c"/><div className="star star-d"/><div className="star star-e"/><div className="art-caption"><span>01 / INFINITE WORLDS</span><span>EST. BY KRYPTONIA</span></div></div><div className="hero-bottom-fade"/>
    </section>
    <section className="welcome-strip"><div className="welcome-icon"><Clapperboard size={18}/></div><div><p className="welcome-title">The next chapter starts here.</p><p className="welcome-subtitle">Live entertainment discovery, brought together by FrameXTV.</p></div><span className="welcome-tag">KRYORA ORIGINAL EXPERIENCE</span></section>
    {loading && <div className="catalogue-status"><span className="loading-spinner"/> Connecting to FrameXTV catalogue…</div>}
    {error && <div className="catalogue-error"><strong>Catalogue connection unavailable</strong><p>{error}</p><button className="secondary-button" onClick={() => {setLoading(true);setError("");getFrameXTVHome().then(setHome).catch((e: unknown)=>setError(e instanceof Error?e.message:"Catalogue request failed.")).finally(()=>setLoading(false));}} type="button">Try again</button></div>}
    {!loading && !error && visibleRails.map((rail) => <section className="catalogue-rail" key={rail.key}><div className="section-heading"><div><p className="section-overline">DISCOVER ON KRYORA</p><h2>{rail.title}</h2></div><span className="rail-count">{rail.items.length} titles</span></div><div className="poster-grid">{rail.items.map((item) => <PosterCard key={item.id} item={item} onOpen={openTitle}/>)}</div></section>)}
    {!loading && !error && visibleRails.length === 0 && <div className="empty-state">No catalogue sections are available for this category yet.</div>}
    <section className="discovery-section"><div className="section-heading"><div><p className="section-overline">BROWSE BY FORMAT</p><h2>Explore your universe</h2></div></div><div className="category-grid">
      <button className="category-card" onClick={() => setActiveNav("Movies")} type="button"><span className="category-icon"><Film size={22}/></span><span><strong>Movies</strong><small>Stories made for the big screen</small></span><ArrowRight className="category-arrow" size={17}/></button>
      <button className="category-card" onClick={() => setActiveNav("Series")} type="button"><span className="category-icon"><Tv size={22}/></span><span><strong>Series</strong><small>Worlds worth returning to</small></span><ArrowRight className="category-arrow" size={17}/></button>
      <button className="category-card" onClick={() => setActiveNav("Anime")} type="button"><span className="category-icon"><Sparkles size={22}/></span><span><strong>Anime & animation</strong><small>Imagination without boundaries</small></span><ArrowRight className="category-arrow" size={17}/></button>
      <button className="category-card" type="button"><span className="category-icon"><Bookmark size={22}/></span><span><strong>Your watchlist</strong><small>Personal watchlists are coming later</small></span><ArrowRight className="category-arrow" size={17}/></button>
    </div></section>
    <footer className="footer"><a className="brand footer-brand" href="/"><span className="brand-mark">K</span><span className="brand-word">KRYORA</span></a><span>Beyond Every Story.</span><span className="footer-credit">A PRODUCT OF <strong>KRYPTONIA</strong></span><span className="footer-copy">© {new Date().getFullYear()} KRYORA. All rights reserved.</span></footer>
    {selected && <div className="detail-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(e) => e.stopPropagation()}><button className="detail-close icon-button" onClick={() => setSelected(null)} aria-label="Close details" type="button"><X/></button>
      {details?.backdropUrl && <div className="detail-backdrop-image"><img src={details.backdropUrl} alt=""/></div>}
      <div className="detail-body"><p className="section-overline">{selected.kind.toUpperCase()} · FRAMEX TV</p><h2>{details?.title ?? selected.title}</h2>{detailLoading && <p className="search-hint">Loading title information…</p>}{detailError && <p className="detail-error">{detailError}</p>}
        <div className="detail-meta">{(details?.year ?? selected.year) && <span><CalendarDays size={14}/>{details?.year ?? selected.year}</span>}{(details?.averageRating ?? selected.averageRating) !== undefined && <span><Star size={14}/>{(details?.averageRating ?? selected.averageRating)?.toFixed(1)}</span>}{details?.runtimeMinutes && <span><Clock size={14}/>{details.runtimeMinutes} min</span>}</div>
        <p className="detail-overview">{details?.synopsis ?? selected.synopsis ?? "No synopsis is available."}</p>
        <div className="genre-list">{(details?.genres ?? selected.genres).map((g) => <span key={g.id}>{g.name}</span>)}</div>
        {selected.kind === "movie" && <button className="primary-button detail-watch" onClick={() => startWatch("movie",selected.providerId)} type="button"><Play size={16} fill="currentColor"/> Watch movie</button>}
        {selected.kind === "series" && details && <div className="episode-panel"><div className="season-select-row"><h3>Episodes</h3><select value={seasonNumber} onChange={(e)=>setSeasonNumber(Number(e.target.value))} aria-label="Select season">{details.seasons.filter((s)=>s.number>0).map((s)=><option value={s.number} key={s.number}>{s.name || `Season ${s.number}`}</option>)}</select></div>{episodeLoading ? <p className="search-hint">Loading episodes…</p> : episodes.map((ep)=><div className="episode-row" key={ep.id || ep.number}><div className="episode-thumb">{ep.still && <img src={ep.still} alt=""/>}<span>{ep.number}</span></div><div className="episode-info"><strong>{ep.name || `Episode ${ep.number}`}</strong><p>{ep.overview || ep.airDate || ""}</p></div><button className="episode-play" onClick={()=>startWatch("series",selected.providerId,seasonNumber,ep.number)} aria-label={`Play episode ${ep.number}`} type="button"><Play size={16} fill="currentColor"/></button></div>)}</div>}
        {selected.kind === "anime" && <p className="anime-note">Anime discovery is available in the FrameXTV catalogue. Its separate playback route still needs verification before we enable a watch button.</p>}
      </div></section></div>}
  </main>;
}
export default App;
