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

  if(endpoint==="discover"){
   const kind=url.searchParams.get("kind")||"all";
   const genre=(url.searchParams.get("genre")||"").trim();
   const year=(url.searchParams.get("year")||"").trim();
   const sort=url.searchParams.get("sort")||"popularity";
   const query=(url.searchParams.get("q")||"").trim();
   const page=Math.max(1,Math.min(50,Number(url.searchParams.get("page")||"1")||1));
   if(!["all","movie","series","anime"].includes(kind))return NextResponse.json({error:"Invalid content type."},{status:400});
   if(year && !/^\d{4}$/.test(year))return NextResponse.json({error:"Invalid release year."},{status:400});
   const genreIds:Record<string,string>={Action:"28",Adventure:"12",Animation:"16",Comedy:"35",Crime:"80",Documentary:"99",Drama:"18",Family:"10751",Fantasy:"14",History:"36",Horror:"27",Music:"10402",Mystery:"9648",Romance:"10749","Science Fiction":"878",Thriller:"53",War:"10752",Western:"37","Action & Adventure":"10759",Kids:"10762","Sci-Fi & Fantasy":"10765",Sports:""};
   const tmdbSort:Record<string,string>={popularity:"popularity.desc",rating:"vote_average.desc",newest:"primary_release_date.desc",alphabetical:"original_title.asc"};
   const providerErrors:Record<string,string>={};
   const tmdbDiscover=async(media:"movie"|"tv")=>{
    const p=new URLSearchParams({page:String(page),sort_by:tmdbSort[sort]||tmdbSort.popularity,"vote_count.gte":"10"});
    if(year)p.set(media==="movie"?"primary_release_year":"first_air_date_year",year);
    if(genreIds[genre])p.set("with_genres",genreIds[genre]);
    const path=query?"/search/"+media+"?query="+encodeURIComponent(query)+"&page="+page:"/discover/"+media+"?"+p.toString();
    const data=await tmdb(path);
    return (data.results||[]).map((x:Raw)=>mapTmdb(x,media==="tv"?"series":"movie"));
   };
   const animeGenreMatches=(item:any)=>{
    if(!genre)return true;
    const names=(item.genres||[]).map((g:any)=>g.name);
    if(genre==="Animation")return true;
    if(genre==="Science Fiction")return names.includes("Sci-Fi");
    if(genre==="Action & Adventure")return names.includes("Action")||names.includes("Adventure");
    if(genre==="Sci-Fi & Fantasy")return names.includes("Sci-Fi")||names.includes("Fantasy");
    return names.includes(genre);
   };
   const anilistDiscover=async()=>{
    const variables:Record<string,unknown>={page,perPage:50};
    const definitions=["$page:Int","$perPage:Int"];
    const filters=["type:ANIME","isAdult:false"];
    if(query){definitions.push("$search:String");variables.search=query;filters.push("search:$search");}
    if(year){definitions.push("$year:Int");variables.year=Number(year);filters.push("seasonYear:$year");}
    const animeGenres:Record<string,string[]>={Action:["Action"],Adventure:["Adventure"],Comedy:["Comedy"],Drama:["Drama"],Fantasy:["Fantasy"],Horror:["Horror"],Mystery:["Mystery"],Romance:["Romance"],"Science Fiction":["Sci-Fi"],Thriller:["Thriller"],Sports:["Sports"],"Action & Adventure":["Action","Adventure"],"Sci-Fi & Fantasy":["Sci-Fi","Fantasy"],Kids:["Kids"]};
    const selectedGenres=animeGenres[genre];
    if(selectedGenres){definitions.push("$genres:[String]");variables.genres=selectedGenres;filters.push("genre_in:$genres");}
    const animeSort:Record<string,string>={popularity:"POPULARITY_DESC",rating:"SCORE_DESC",newest:"START_DATE_DESC",alphabetical:"TITLE_ROMAJI"};
    const sortValue=animeSort[sort]||animeSort.popularity;
    const queryText=`query (${definitions.join(",")}) { Page(page:$page,perPage:$perPage) { media(${filters.join(",")},sort:[${sortValue}]) { id title { english romaji native } coverImage { extraLarge large } bannerImage description episodes genres averageScore seasonYear } } }`;
    const data=await anilist(queryText,variables);
    return (data.Page?.media||[]).map(mapAnime);
   };
   const tasks:Promise<any[]>[]=[];
   if(kind==="all"||kind==="movie")tasks.push(tmdbDiscover("movie").catch((e)=>{providerErrors.tmdb=e instanceof Error?e.message:"TMDB discovery failed.";return [];}));
   if(kind==="all"||kind==="series")tasks.push(tmdbDiscover("tv").catch((e)=>{providerErrors.tmdb=e instanceof Error?e.message:"TMDB discovery failed.";return [];}));
   if(kind==="all"||kind==="anime")tasks.push(anilistDiscover().catch((e)=>{providerErrors.anilist=e instanceof Error?e.message:"AniList discovery failed.";return [];}));
   const groups=await Promise.all(tasks);
   let results=groups.flat();
   if(year)results=results.filter((item:any)=>String(item.year||"")===year);
   if(genre)results=results.filter((item:any)=>{
    if(item.provider==="anilist")return animeGenreMatches(item);
    return (item.genres||[]).some((g:any)=>g.name===genre);
   });
   if(sort==="rating")results.sort((a,b)=>(b.averageRating||0)-(a.averageRating||0));
   if(sort==="newest")results.sort((a,b)=>(b.year||0)-(a.year||0));
   if(sort==="alphabetical")results.sort((a,b)=>a.title.localeCompare(b.title));
   if(kind==="anime"&&providerErrors.anilist)return NextResponse.json({error:"AniList discovery failed: "+providerErrors.anilist,results:[],providerErrors},{status:502});
   return NextResponse.json({results,page,filters:{kind,genre,year,sort},providerErrors},{headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=300"}});
  }
  if(endpoint==="season"){
   const id=url.searchParams.get("id")||"", season=url.searchParams.get("season")||"";
   if(!/^\\d+$/.test(id)||!/^\\d+$/.test(season))return NextResponse.json({error:"Invalid season identifier."},{status:400});
   const data=await tmdb("/tv/"+id+"/season/"+season);
   return NextResponse.json({episodes:(data.episodes||[]).map((ep:any)=>({id:String(ep.id),number:ep.episode_number,name:ep.name,still:image(ep.still_path,"w500"),airDate:ep.air_date,rating:ep.vote_average,overview:ep.overview}))});
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
