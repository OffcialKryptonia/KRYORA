import { NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p";
const ANILIST = "https://graphql.anilist.co";
type MediaKind = "movie" | "series" | "anime" | "animation";
type Raw = { id:number; title?:string; name?:string; overview?:string; poster_path?:string|null; backdrop_path?:string|null; vote_average?:number; release_date?:string; first_air_date?:string; genre_ids?:number[]; runtime?:number; number_of_episodes?:number; seasons?:Array<{season_number:number;name:string;episode_count:number;poster_path?:string|null}>; genres?:Array<{id:number;name:string}>; };
const genreNames:Record<number,string>={28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Science Fiction",10770:"TV Movie",53:"Thriller",10752:"War",37:"Western",10759:"Action & Adventure",10762:"Kids",10763:"News",10764:"Reality",10765:"Sci-Fi & Fantasy",10766:"Soap",10767:"Talk",10768:"War & Politics"};
function image(path?:string|null,size="w500"){return path?IMAGE+"/"+size+path:undefined;}
function mapTmdb(raw:Raw,kind:MediaKind){
 const date=raw.release_date||raw.first_air_date||"";
 return {id:"tmdb:"+kind+":"+raw.id,provider:"tmdb",providerId:String(raw.id),kind,title:raw.title||raw.name||"Untitled",synopsis:raw.overview||"",releaseDate:date||undefined,year:date?Number(date.slice(0,4)):undefined,runtimeMinutes:raw.runtime,posterUrl:image(raw.poster_path),backdropUrl:image(raw.backdrop_path,"w1280"),averageRating:raw.vote_average,genres:(raw.genre_ids||raw.genres?.map(g=>g.id)||[]).map(id=>({id:String(id),name:genreNames[id]||"Other"}))};
}
function mapAnime(m:any){
 const title=m.title?.english||m.title?.romaji||m.title?.native||"Untitled anime";
 return {id:"anilist:anime:"+m.id,provider:"anilist",providerId:String(m.id),kind:"anime" as const,title,synopsis:(m.description||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim(),year:m.seasonYear,posterUrl:m.coverImage?.extraLarge||m.coverImage?.large,backdropUrl:m.bannerImage,averageRating:m.averageScore?m.averageScore/10:undefined,genres:(m.genres||[]).map((name:string,i:number)=>({id:String(i),name}))};
}
async function tmdb(path:string){
 const token=process.env.TMDB_API_READ_ACCESS_TOKEN;
 const key=process.env.TMDB_API_KEY;
 if(!token&&!key) throw new Error("TMDB is not configured. Add TMDB_API_READ_ACCESS_TOKEN or TMDB_API_KEY in Vercel Project Settings → Environment Variables.");
 const url=new URL(TMDB+path);
 if(key)url.searchParams.set("api_key",key);
 const response=await fetch(url,{headers:token?{Authorization:"Bearer "+token,Accept:"application/json"}:{Accept:"application/json"},next:{revalidate:300}});
 if(!response.ok)throw new Error("TMDB request failed (HTTP "+response.status+").");
 return response.json();
}
async function anilist(query:string,variables:Record<string,unknown>){
 const response=await fetch(ANILIST,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({query,variables}),next:{revalidate:300}});
 if(!response.ok)throw new Error("AniList request failed (HTTP "+response.status+").");
 const json=await response.json(); if(json.errors?.length)throw new Error("AniList could not return catalogue data."); return json.data;
}
const animeQuery=`query ($page:Int,$perPage:Int,$search:String) { Page(page:$page,perPage:$perPage) { media(type:ANIME,isAdult:false,sort:POPULARITY_DESC,search:$search) { id title { english romaji native } coverImage { extraLarge large } bannerImage description episodes genres averageScore seasonYear } } }`;
export async function GET(request:Request,context:{params:Promise<{path:string[]}>}){
 const {path}=await context.params; const endpoint=path.join("/"); const url=new URL(request.url);
 try {
  if(endpoint==="home"){
   const rails:any[]=[];
   let tmdbUnavailable="";
   try {
    const [trending,popular,releases,tv]=await Promise.all([
     tmdb("/trending/movie/week"),tmdb("/movie/popular"),tmdb("/movie/now_playing"),tmdb("/tv/popular")
    ]);
    rails.push({key:"trending_movies",title:"Trending Movies",items:(trending.results||[]).map((x:Raw)=>mapTmdb(x,"movie"))});
    rails.push({key:"popular_movies",title:"Popular Movies",items:(popular.results||[]).map((x:Raw)=>mapTmdb(x,"movie"))});
    rails.push({key:"new_releases",title:"New Releases",items:(releases.results||[]).map((x:Raw)=>mapTmdb(x,"movie"))});
    rails.push({key:"popular_tv",title:"Popular Series",items:(tv.results||[]).map((x:Raw)=>mapTmdb(x,"series"))});
   } catch(e){tmdbUnavailable=e instanceof Error?e.message:"TMDB is temporarily unavailable.";}
   try {
    const anime=await anilist(animeQuery,{page:1,perPage:20});
    rails.push({key:"popular_anime",title:"Popular Anime",items:(anime.Page?.media||[]).map(mapAnime)});
   } catch {}
   if(!rails.length) return NextResponse.json({error:tmdbUnavailable||"Catalogue providers are temporarily unavailable."},{status:503});
   return NextResponse.json({hero:rails[0]?.items?.[0]||rails.at(-1)?.items?.[0]||null,rails,providerStatus:{tmdb:tmdbUnavailable?"unconfigured_or_unavailable":"available",anilist:rails.some(r=>r.key==="popular_anime")?"available":"unavailable",message:tmdbUnavailable}},{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=600"}});
  }
  if(endpoint==="search"){
   const q=(url.searchParams.get("q")||"").trim(); if(q.length<2)return NextResponse.json({results:[]});
   const results:any[]=[];
   try{const [movies,tv]=await Promise.all([tmdb("/search/movie?query="+encodeURIComponent(q)),tmdb("/search/tv?query="+encodeURIComponent(q))]);results.push(...(movies.results||[]).map((x:Raw)=>mapTmdb(x,"movie")),...(tv.results||[]).map((x:Raw)=>mapTmdb(x,"series")));}catch{}
   try{const anime=await anilist(animeQuery,{page:1,perPage:12,search:q});results.push(...(anime.Page?.media||[]).map(mapAnime));}catch{}
   return NextResponse.json({results},{headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=300"}});
  }
  if(endpoint==="details"){
   const kind=(url.searchParams.get("kind")||"movie") as MediaKind; const id=url.searchParams.get("id")||"";
   if(!/^\d+$/.test(id)||!["movie","series","anime"].includes(kind))return NextResponse.json({error:"Invalid title identifier."},{status:400});
   if(kind==="anime"){
    const data=await anilist(`query ($id:Int) { Media(id:$id,type:ANIME,isAdult:false) { id title { english romaji native } coverImage { extraLarge large } bannerImage description episodes genres averageScore seasonYear } }`,{id:Number(id)});
    const m=data.Media;if(!m)return NextResponse.json({error:"Title not found."},{status:404});
    return NextResponse.json({...mapAnime(m),episodeCount:m.episodes,seasons:[],recommendations:[]});
   }
   const data=await tmdb("/"+(kind==="series"?"tv":"movie")+"/"+id+"?append_to_response=credits,recommendations");
   return NextResponse.json({...mapTmdb(data,kind),originalTitle:data.original_title||data.original_name,voteCount:data.vote_count,status:data.status,tagline:data.tagline,episodeCount:data.number_of_episodes,seasons:(data.seasons||[]).map((s:any)=>({number:s.season_number,name:s.name,poster:image(s.poster_path),episodeCount:s.episode_count})),recommendations:(data.recommendations?.results||[]).map((x:Raw)=>mapTmdb(x,kind))});
  }
  return NextResponse.json({error:"Catalogue endpoint not found."},{status:404});
 } catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Catalogue service error."},{status:503});}
}
