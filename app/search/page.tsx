"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, SlidersHorizontal, X, Film, Tv, PanelsTopLeft, Compass, Star, CalendarDays } from "lucide-react";
import type { CatalogueTitle, MediaKind } from "../../src/lib/catalogue/types";

type KindFilter = "all" | "movie" | "series" | "anime";
type SortOption = "popularity" | "rating" | "newest" | "alphabetical";
const genres = ["Action","Adventure","Animation","Comedy","Crime","Documentary","Drama","Family","Fantasy","History","Horror","Music","Mystery","Romance","Science Fiction","Thriller","War","Western","Action & Adventure","Kids","Sci-Fi & Fantasy","Sports"];
const years = Array.from({length: new Date().getFullYear()-1949},(_,i)=>String(new Date().getFullYear()-i));
function kindLabel(kind:MediaKind){return kind==="series"?"Series":kind==="anime"?"Anime":"Movie";}
export default function SearchPage(){
 const [q,setQ]=useState(""); const [kind,setKind]=useState<KindFilter>("all"); const [genre,setGenre]=useState(""); const [year,setYear]=useState(""); const [sort,setSort]=useState<SortOption>("popularity");
 const [results,setResults]=useState<CatalogueTitle[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [selected,setSelected]=useState<CatalogueTitle|null>(null); const [mobileFilters,setMobileFilters]=useState(false);
 const activeCount=[kind!=="all",!!genre,!!year,sort!=="popularity"].filter(Boolean).length;
 const runSearch=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const params=new URLSearchParams({kind,sort,page:"1"});
   if(q.trim().length>=2)params.set("q",q.trim()); if(genre)params.set("genre",genre);if(year)params.set("year",year);
   const response=await fetch("/api/catalogue/discover?"+params.toString(),{headers:{Accept:"application/json"}});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Search is temporarily unavailable.");
   setResults(Array.isArray(data.results)?data.results:[]);
  }catch(e){setError(e instanceof Error?e.message:"Unable to search the catalogue.");setResults([]);}
  finally{setLoading(false);}
 },[q,kind,genre,year,sort]);
 useEffect(()=>{const timer=window.setTimeout(()=>{void runSearch();},250);return()=>window.clearTimeout(timer);},[runSearch]);
 const clear=()=>{setQ("");setKind("all");setGenre("");setYear("");setSort("popularity");};
 const filterControls=<>
  <label className="advanced-field"><span>Content type</span><select value={kind} onChange={e=>setKind(e.target.value as KindFilter)}><option value="all">All content</option><option value="movie">Movies</option><option value="series">Series</option><option value="anime">Anime</option></select></label>
  <label className="advanced-field"><span>Genre</span><select value={genre} onChange={e=>setGenre(e.target.value)}><option value="">All genres</option>{genres.map(g=><option key={g} value={g}>{g}</option>)}</select></label>
  <label className="advanced-field"><span>Release year</span><select value={year} onChange={e=>setYear(e.target.value)}><option value="">Any year</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
  <label className="advanced-field"><span>Sort by</span><select value={sort} onChange={e=>setSort(e.target.value as SortOption)}><option value="popularity">Most popular</option><option value="rating">Highest rated</option><option value="newest">Newest first</option><option value="alphabetical">A–Z</option></select></label>
 </>;
 return <main className="advanced-search-page">
  <header className="advanced-search-top"><Link href="/" className="advanced-brand"><span className="auth-mark">K</span><span>KRYORA</span></Link><Link href="/" className="advanced-back"><ArrowLeft size={16}/> Back to discover</Link></header>
  <section className="advanced-search-content">
   <p className="auth-eyebrow">THE KRYORA CATALOGUE</p><h1>Find your next story.</h1><p className="advanced-intro">Search across movies, series and anime. Refine your results by genre, release year and rating.</p>
   <div className="advanced-searchbar"><Search size={20}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search titles, movies, series or anime…" aria-label="Search the catalogue"/>{q&&<button type="button" onClick={()=>setQ("")} aria-label="Clear search"><X size={17}/></button>}</div>
   <div className="advanced-toolbar"><div><strong>Refine results</strong>{activeCount>0&&<span className="advanced-active-count">{activeCount} active</span>}</div><button className="advanced-mobile-filter" type="button" onClick={()=>setMobileFilters(v=>!v)}><SlidersHorizontal size={16}/> Filters</button><button className="advanced-clear" type="button" onClick={clear}>Clear all</button></div>
   <div className="advanced-filter-grid">{filterControls}</div>
   {mobileFilters&&<div className="advanced-mobile-panel">{filterControls}<button type="button" className="advanced-apply" onClick={()=>setMobileFilters(false)}>Show results</button></div>}
   <div className="advanced-results-heading"><div><h2>{q.trim().length>=2? "Search results":"Explore the catalogue"}</h2><p>{loading?"Finding titles…":results.length+" titles found"}</p></div><span className="advanced-source">TMDB + ANILIST</span></div>
   {error&&<div className="advanced-error">{error}</div>}
   {loading&&<div className="advanced-loading"><span/> Searching the KRYORA catalogue…</div>}
   {!loading&&!error&&results.length===0&&<div className="advanced-empty"><Search size={30}/><strong>No titles found</strong><p>Try a different keyword or remove one or more filters.</p><button type="button" onClick={clear}>Reset filters</button></div>}
   <div className="advanced-results-grid">{results.map(item=><button className="advanced-result-card" key={item.id} type="button" onClick={()=>setSelected(item)}>
    <span className="advanced-poster">{item.posterUrl?<img src={item.posterUrl} alt="" loading="lazy"/>:<span className="advanced-poster-fallback">{item.kind==="anime"?<PanelsTopLeft/>:item.kind==="series"?<Tv/>:<Film/>}</span>}<span className="advanced-kind">{kindLabel(item.kind)}</span></span>
    <span className="advanced-card-title">{item.title}</span><span className="advanced-card-meta">{item.year||"Year unknown"}{item.averageRating!==undefined&&<> · <Star size={11} fill="currentColor"/> {item.averageRating.toFixed(1)}</>}</span>
   </button>)}</div>
  </section>
  {selected&&<div className="advanced-detail-overlay" role="presentation" onClick={()=>setSelected(null)}><section className="advanced-detail" role="dialog" aria-modal="true" aria-label={selected.title} onClick={e=>e.stopPropagation()}><button className="advanced-detail-close" type="button" onClick={()=>setSelected(null)} aria-label="Close"><X/></button>{selected.backdropUrl&&<img className="advanced-detail-backdrop" src={selected.backdropUrl} alt=""/>}<div className="advanced-detail-copy"><p className="auth-eyebrow">{kindLabel(selected.kind).toUpperCase()} · KRYORA</p><h2>{selected.title}</h2><div className="advanced-card-meta">{selected.year||"Year unknown"}{selected.averageRating!==undefined&&<> · <Star size={13} fill="currentColor"/> {selected.averageRating.toFixed(1)}</>}</div><p>{selected.synopsis||"No synopsis is available for this title."}</p><div className="advanced-detail-genres">{selected.genres?.map(g=><span key={g.id}>{g.name}</span>)}</div><Link href="/auth" className="advanced-detail-link">Sign in to save titles</Link></div></section></div>}
  <footer className="advanced-footer">KRYORA · A PRODUCT OF KRYPTONIA</footer>
 </main>;
}
