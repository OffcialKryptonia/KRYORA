import { NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p";
type Seed = { provider:"tmdb"|"anilist"; kind:"movie"|"tv"|"anime"; id:string };
function poster(path?:string|null){return path?IMAGE+"/w500"+path:undefined;}
function mapTmdb(x:any,kind:"movie"|"tv"){const date=x.release_date||x.first_air_date||"";return{id:"tmdb:"+kind+":"+x.id,provider:"tmdb",providerId:String(x.id),kind:kind==="tv"?"series":"movie",title:x.title||x.name||"Untitled",synopsis:x.overview||"",year:date?Number(date.slice(0,4)):undefined,posterUrl:poster(x.poster_path),backdropUrl:x.backdrop_path?IMAGE+"/w1280"+x.backdrop_path:undefined,averageRating:x.vote_average,genres:[]};}
function mapAnime(x:any){const title=x.title?.english||x.title?.romaji||x.title?.native||"Untitled anime";return{id:"anilist:anime:"+x.id,provider:"anilist",providerId:String(x.id),kind:"anime",title,synopsis:(x.description||"").replace(/<[^>]*>/g," ").replace(/\\s+/g," ").trim(),year:x.seasonYear,posterUrl:x.coverImage?.extraLarge||x.coverImage?.large,backdropUrl:x.bannerImage,averageRating:x.averageScore?x.averageScore/10:undefined,genres:(x.genres||[]).map((name:string,i:number)=>({id:String(i),name}))};}
async function tmdb(path:string){const token=process.env.TMDB_API_READ_ACCESS_TOKEN,key=process.env.TMDB_API_KEY;if(!token&&!key)throw new Error("TMDB is not configured.");const u=new URL(TMDB+path);if(key)u.searchParams.set("api_key",key);const r=await fetch(u,{headers:token?{Authorization:"Bearer "+token,Accept:"application/json"}:{Accept:"application/json"},next:{revalidate:180}});if(!r.ok)throw new Error("TMDB recommendations unavailable.");return r.json();}
async function anilist(id:number){const query=`query ($id:Int) { Media(id:$id,type:ANIME,isAdult:false) { recommendations(page:1,perPage:12,sort:RATING_DESC) { nodes { mediaRecommendation { id title { english romaji native } coverImage { extraLarge large } bannerImage description genres averageScore seasonYear type } } } } }`;const r=await fetch("https://graphql.anilist.co",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({query,variables:{id}}),next:{revalidate:180}});if(!r.ok)throw new Error("AniList recommendations unavailable.");return r.json();}
export async function POST(request:Request){
 try{
  const body=await request.json() as {seeds?:Seed[]};
  const seeds=(Array.isArray(body.seeds)?body.seeds:[]).filter(s=>s&&["tmdb","anilist"].includes(s.provider)&&["movie","tv","anime"].includes(s.kind)&&/^\\d+$/.test(String(s.id))).slice(0,12);
  if(!seeds.length)return NextResponse.json({items:[],message:"Save a few titles to personalize your recommendations."});
  const jobs=seeds.map(async seed=>{
   if(seed.provider==="tmdb"&&seed.kind!=="anime"){const kind=seed.kind==="tv"?"tv":"movie";const data=await tmdb("/"+kind+"/"+seed.id+"/recommendations");return(data.results||[]).slice(0,8).map((x:any)=>mapTmdb(x,kind));}
   if(seed.provider==="anilist"){const data=await anilist(Number(seed.id));return(data.data?.Media?.recommendations?.nodes||[]).map((n:any)=>n.mediaRecommendation).filter((x:any)=>x&&x.type==="ANIME").map(mapAnime);}
   return[];
  });
  const settled=await Promise.allSettled(jobs);const seen=new Set<string>();const items=settled.flatMap(x=>x.status==="fulfilled"?x.value:[]).filter((x:any)=>{if(seen.has(x.id))return false;seen.add(x.id);return true;}).sort((a:any,b:any)=>(b.averageRating??0)-(a.averageRating??0)).slice(0,36);
  return NextResponse.json({items,partial:items.length===0||settled.some(x=>x.status==="rejected")},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Unable to generate personalized recommendations."},{status:400});}
}
