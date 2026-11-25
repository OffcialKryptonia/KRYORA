import type { CatalogueTitle, MediaKind } from "./catalogue/types";

const API_BASE = "/api/catalogue";
export interface FrameXTVRail { key:string; title:string; items:CatalogueTitle[]; }
export interface FrameXTVHome { hero:CatalogueTitle|null; rails:FrameXTVRail[]; providerStatus?:{tmdb:string;anilist:string;message?:string}; }
export interface FrameXTVSeason { number:number; name:string; poster?:string; episodeCount?:number; }
export interface FrameXTVEpisode { id:string; number:number; name:string; still?:string; airDate?:string; rating?:string|number; overview?:string; }
export interface FrameXTVDetails extends CatalogueTitle {
 originalTitle?:string; voteCount?:number; status?:string; tagline?:string; episodeCount?:number;
 seasons:FrameXTVSeason[]; recommendations:CatalogueTitle[];
}
async function getJson<T>(path:string):Promise<T>{
 const response=await fetch(API_BASE+path,{headers:{Accept:"application/json"}});
 const payload=await response.json().catch(()=>null) as ({error?:string}|T|null);
 if(!response.ok){const message=payload&&typeof payload==="object"&&"error" in payload&&typeof payload.error==="string"?payload.error:`Catalogue request failed (HTTP ${response.status}).`;throw new Error(message);}
 if(payload===null)throw new Error("Catalogue provider returned an empty response.");
 return payload as T;
}
export async function getFrameXTVHome():Promise<FrameXTVHome>{return getJson<FrameXTVHome>("/home");}
export async function searchFrameXTV(query:string):Promise<CatalogueTitle[]>{
 const data=await getJson<{results?:CatalogueTitle[]}>(`/search?q=${encodeURIComponent(query)}`);
 return data.results??[];
}
export async function getFrameXTVDetails(id:string,kind:MediaKind):Promise<FrameXTVDetails>{
 const provider=kind==="anime"?"anilist":"tmdb";
 return getJson<FrameXTVDetails>(`/details?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}&provider=${provider}`);
}
export async function getFrameXTVSeason(id:string,season:number):Promise<FrameXTVEpisode[]>{
 const data=await getJson<{episodes?:FrameXTVEpisode[]}>(`/season?id=${encodeURIComponent(id)}&season=${season}`);
 return data.episodes??[];
}
