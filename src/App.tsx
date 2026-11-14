import { useState } from "react";
import { FrameXTVPlayer } from "./components/FrameXTVPlayer";
import type { FrameXTVPlaybackRequest } from "./lib/framextv";
import {
  ArrowRight,
  Bell,
  Bookmark,
  ChevronDown,
  Clapperboard,
  Compass,
  Film,
  Menu,
  Play,
  Search,
  Sparkles,
  Tv,
  X,
} from "lucide-react";

type NavItem = "Home" | "Movies" | "Series" | "Anime";

const navItems: NavItem[] = ["Home", "Movies", "Series", "Anime"];

function getPlaybackRequest(): FrameXTVPlaybackRequest | null {
  const params = new URLSearchParams(window.location.search);
  const media = params.get("watch");
  const tmdbId = params.get("id") ?? "";
  if ((media !== "movie" && media !== "series") || !/^\d+$/.test(tmdbId)) return null;
  if (media === "movie") return { media, tmdbId };
  const season = Number(params.get("season"));
  const episode = Number(params.get("episode"));
  if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 1 || episode < 1) return null;
  return { media, tmdbId, season, episode };
}

function WatchPage({ request }: { request: FrameXTVPlaybackRequest }) {
  const description = request.media === "movie"
    ? "Movie playback"
    : `Season ${request.season} · Episode ${request.episode}`;
  return (
    <main className="watch-page">
      <header className="watch-header">
        <a className="brand" href="/" aria-label="KRYORA home"><span className="brand-mark">K</span><span className="brand-word">KRYORA</span></a>
        <span className="watch-provider">POWERED BY FRAMEX TV</span>
      </header>
      <div className="watch-content">
        <a className="watch-back" href="/">← Back to KRYORA</a>
        <div className="watch-heading"><div><p className="section-overline">NOW PLAYING</p><h1>Continue your story</h1><p>${description} · TMDB ID ${request.tmdbId}</p></div></div>
        <FrameXTVPlayer request={request} />
        <p className="watch-disclaimer">Playback is provided by FrameXTV. Availability depends on the external player and its supported content.</p>
      </div>
      <footer className="watch-footer">KRYORA · A PRODUCT OF KRYPTONIA</footer>
    </main>
  );
}

function App() {
  const [activeNav, setActiveNav] = useState<NavItem>("Home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const playbackRequest = getPlaybackRequest();

  if (playbackRequest) return <WatchPage request={playbackRequest} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="KRYORA home">
          <span className="brand-mark">K</span>
          <span className="brand-word">KRYORA</span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              className={activeNav === item ? "nav-link active" : "nav-link"}
              key={item}
              onClick={() => setActiveNav(item)}
              type="button"
            >
              {item}
            </button>
          ))}
          <button className="nav-link explore-link" type="button">
            Explore <ChevronDown size={14} />
          </button>
        </nav>

        <div className="topbar-actions">
          <button
            className="icon-button"
            aria-label="Search"
            onClick={() => setSearchOpen((open) => !open)}
            type="button"
          >
            <Search size={19} />
          </button>
          <button className="icon-button notification-button" aria-label="Notifications" type="button">
            <Bell size={19} />
          </button>
          <button className="profile-button" aria-label="Open profile" type="button">K</button>
          <button
            className="icon-button mobile-menu-trigger"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
            type="button"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      {searchOpen && (
        <section className="search-panel" aria-label="Catalogue search">
          <Search size={18} />
          <input autoFocus placeholder="Search movies, series, anime..." aria-label="Search titles" />
          <span className="search-hint">Catalogue connection pending</span>
          <button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search" type="button">
            <X size={18} />
          </button>
        </section>
      )}

      {mobileMenuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <button key={item} onClick={() => { setActiveNav(item); setMobileMenuOpen(false); }} type="button">
              {item}
            </button>
          ))}
        </nav>
      )}

      <section className="hero">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-line" /> THE UNIVERSE OF ENTERTAINMENT</div>
          <p className="hero-kicker">A NEW WAY TO EXPERIENCE STORIES</p>
          <h1>Beyond<br /><span>Every Story.</span></h1>
          <p className="hero-copy">
            Your next obsession is out there. Step into a universe of cinema,
            unforgettable series, anime and animation.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setActiveNav("Movies")}>
              <Compass size={17} /> Explore the universe <ArrowRight size={16} />
            </button>
            <button className="secondary-button" type="button" onClick={() => setActiveNav("Series")}>
              <Play size={16} /> Discover series
            </button>
          </div>
          <div className="hero-footnote"><Sparkles size={14} /> STORIES WITHOUT LIMITS</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="planet-glow" />
          <div className="planet">
            <div className="planet-highlight" />
            <div className="planet-ring" />
          </div>
          <div className="star star-a" /><div className="star star-b" /><div className="star star-c" />
          <div className="star star-d" /><div className="star star-e" />
          <div className="art-caption"><span>01 / INFINITE WORLDS</span><span>EST. BY KRYPTONIA</span></div>
        </div>
        <div className="hero-bottom-fade" />
      </section>

      <section className="welcome-strip">
        <div className="welcome-icon"><Clapperboard size={18} /></div>
        <div>
          <p className="welcome-title">The next chapter starts here.</p>
          <p className="welcome-subtitle">A world of entertainment, thoughtfully brought together.</p>
        </div>
        <span className="welcome-tag">KRYORA ORIGINAL EXPERIENCE</span>
      </section>

      <section className="discovery-section">
        <div className="section-heading">
          <div>
            <p className="section-overline">FIND YOUR NEXT FAVOURITE</p>
            <h2>Explore your universe</h2>
          </div>
          <button className="text-action" type="button">View all <ArrowRight size={15} /></button>
        </div>
        <div className="category-grid">
          <button className="category-card" type="button" onClick={() => setActiveNav("Movies")}>
            <span className="category-icon"><Film size={22} /></span>
            <span><strong>Movies</strong><small>Stories made for the big screen</small></span>
            <ArrowRight className="category-arrow" size={17} />
          </button>
          <button className="category-card" type="button" onClick={() => setActiveNav("Series")}>
            <span className="category-icon"><Tv size={22} /></span>
            <span><strong>Series</strong><small>Worlds worth returning to</small></span>
            <ArrowRight className="category-arrow" size={17} />
          </button>
          <button className="category-card" type="button" onClick={() => setActiveNav("Anime")}>
            <span className="category-icon"><Sparkles size={22} /></span>
            <span><strong>Anime & animation</strong><small>Imagination without boundaries</small></span>
            <ArrowRight className="category-arrow" size={17} />
          </button>
          <button className="category-card" type="button">
            <span className="category-icon"><Bookmark size={22} /></span>
            <span><strong>Your watchlist</strong><small>Keep every must-watch close</small></span>
            <ArrowRight className="category-arrow" size={17} />
          </button>
        </div>
      </section>

      <section className="provider-notice">
        <div className="notice-indicator" />
        <div>
          <strong>Catalogue integration is the next milestone</strong>
          <p>KRYORA's discovery interface is in place. Verified metadata and authorised playback providers will be connected before titles or watch links are published.</p>
        </div>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="/">
          <span className="brand-mark">K</span><span className="brand-word">KRYORA</span>
        </a>
        <span>Beyond Every Story.</span>
        <span className="footer-credit">A PRODUCT OF <strong>KRYPTONIA</strong></span>
        <span className="footer-copy">© {new Date().getFullYear()} KRYORA. All rights reserved.</span>
      </footer>
    </main>
  );
}

export default App;