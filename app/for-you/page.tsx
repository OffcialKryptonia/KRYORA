"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { ArrowLeft,Bookmark,Compass,Film,Sparkles,Tv } from "lucide-react";
import { supabase } from "../../src/lib/supabase/client";

type Saved={provider:"tmdb"|"anilist";media_type:"movie"|"tv"|"anime";external_id:string};
type Recommendation={id:string;provider:"tmdb"|"anilist";providerId:string;kind:"movie"|"series"|"anime";title:string;synopsis?:string;year?:number;posterUrl?:string;averageRating?:number;genres?:{id:string;name:string}[]};
export default function ForYouPage(){
 const [items,setItems]=useState<Recommendation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[saved,setSaved]=useState<string[]>([]),[saving,setSaving]=useState<string>("");
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setError("Account services are unavailable.");setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){window.location.replace("/auth?next=/for-you");return;}
  const [watch,history]=await Promise.all([
   supabase.from("watchlist_items").select("provider,media_type,external_id").eq("user_id",user.id).order("added_at",{ascending:false}).limit(12),
   supabase.from("viewing_history").select("provider,media_type,external_id").eq("user_id",user.id).order("last_watched_at",{ascending:false}).limit(12)
  ]);
  if(!active)return;
  if(watch.error||history.error){setError(watch.error?.message||history.error?.message||"Unable to read your activity.");setLoading(false);return;}
  const all=[...(watch.data||[]),...(history.data||[])] as Saved[];
  const unique=Array.from(new Map(all.map(x=>[x.provider+":"+x.media_type+":"+x.external_id,x])).values()).slice(0,12);
  if(!unique.length){setItems([]);setLoading(false);return;}
  const seeds=unique.map(x=>({provider:x.provider,kind:x.media_type,id:x.external_id}));
  const response=await fetch("/api/catalogue/recommendations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({seeds})});
  const payload=await response.json();
  if(!active)return;
  if(!response.ok){setError(payload.error||"Recommendations are temporarily unavailable.");setLoading(false);return;}
  setItems(payload.items||[]);setSaved(unique.map(x=>x.provider+":"+x.external_id));setLoading(false);
 }void load();return()=>{active=false;};},[]);
 async function add(item:Recommendation){
  if(!supabase)return;setSaving(item.id);setError("");
  const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.assign("/auth?next=/for-you");return;}
  const {data:list,error:listError}=await supabase.from("watchlists").select("id").eq("user_id",user.id).eq("is_default",true).maybeSingle();
  if(listError||!list){setError(listError?.message||"Your watchlist is unavailable.");setSaving("");return;}
  const media_type=item.kind==="series"?"tv":item.kind==="anime"?"anime":"movie";
  const {error:insertError}=await supabase.from("watchlist_items").insert({watchlist_id:list.id,user_id:user.id,media_type,provider:item.provider,external_id:item.providerId,title:item.title,poster_url:item.posterUrl??null,release_year:item.year??null});
  if(insertError&&insertError.code!=="23505")setError(insertError.message);else setSaved(old=>[...old,item.provider+":"+item.providerId]);
  setSaving("");
 }
 const icon=(kind:string)=>kind==="anime"?<Sparkles size={14}/>:kind==="series"?<Tv size={14}/>:<Film size={14}/>;
 return <main className="for-you-page"><header className="for-you-top"><Link href="/" className="for-you-brand"><span>K</span>KRYORA</Link><Link href="/account" className="for-you-account">My account</Link></header><section className="for-you-content"><Link href="/" className="for-you-back"><ArrowLeft size={15}/> Discover</Link><div className="for-you-heading"><div><p className="auth-eyebrow">CURATED AROUND YOUR TASTE</p><h1>Made for you.</h1><p>Recommendations inspired by titles you've saved and watched.</p></div><span className="for-you-icon"><Compass size={24}/></span></div>
 {loading?<div className="for-you-state">Building your personal collection…</div>:error?<div className="auth-message">{error}</div>:items.length===0?<div className="for-you-state"><Bookmark size={30}/><h2>Your taste profile is taking shape</h2><p>Save titles to your watchlist or build viewing history. KRYORA will use that activity to discover more stories you may enjoy.</p><Link href="/" className="auth-submit for-you-cta">Explore catalogue</Link></div>:<><div className="for-you-result-heading"><h2>Recommended for you</h2><span>{items.length} picks</span></div><div className="for-you-grid">{items.map(item=><article className="for-you-card" key={item.id}><div className="for-you-poster">{item.posterUrl?<img src={item.posterUrl} alt={item.title} loading="lazy"/>:<div className="for-you-no-poster">{icon(item.kind)}</div>}<span className="for-you-kind">{icon(item.kind)} {item.kind}</span></div><div className="for-you-card-info"><h3>{item.title}</h3><p>{item.year||"Release year unavailable"}{item.averageRating?" · ★ "+item.averageRating.toFixed(1):""}</p><button type="button" disabled={saving===item.id||saved.includes(item.provider+":"+item.providerId)} onClick={()=>add(item)}>{saved.includes(item.provider+":"+item.providerId)?"Already in your list":saving===item.id?"Saving…":<><Bookmark size={14}/> Save to watchlist</>}</button></div></article>)}</div></>}
 </section><footer className="for-you-footer">KRYORA · A PRODUCT OF KRYPTONIA</footer></main>;
}
