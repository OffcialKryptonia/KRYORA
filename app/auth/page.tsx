"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigured } from "../../src/lib/supabase/client";

export default function AuthPage() {
  const [mode,setMode]=useState<"login"|"signup">("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function submit(e:FormEvent){
    e.preventDefault();setMessage("");
    if(!supabase){setMessage("Authentication is not configured yet. Add the Supabase environment variables to the Vercel project.");return;}
    setBusy(true);
    try {
      if(mode==="signup"){
        const {error}=await supabase.auth.signUp({email,password,options:{data:{display_name:displayName},emailRedirectTo:typeof window!=="undefined"?window.location.origin+"/account":undefined}});
        if(error)throw error;
        setMessage("Account created. Check your email to verify your address, then sign in.");
      } else {
        const {error}=await supabase.auth.signInWithPassword({email,password});
        if(error)throw error;
        window.location.assign("/account");
      }
    }catch(err){setMessage(err instanceof Error?err.message:"Authentication failed.");}
    finally{setBusy(false);}
  }
  async function resetPassword(){
    if(!supabase){setMessage("Supabase authentication is not configured.");return;}
    if(!email){setMessage("Enter your email address first.");return;}
    setBusy(true);setMessage("");
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/auth"});
    setBusy(false);setMessage(error?error.message:"Password reset email sent. Check your inbox.");
  }
  return <main className="kryora-auth"><Link href="/" className="auth-brand"><span className="auth-mark">K</span>KRYORA</Link><section className="auth-card"><p className="auth-eyebrow">YOUR KRYORA ACCOUNT</p><h1>{mode==="login"?"Welcome back.":"Join KRYORA."}</h1><p className="auth-sub">{mode==="login"?"Sign in to continue your entertainment journey.":"Create an account to save your favourites and personalize your discovery."}</p>
  {!supabaseConfigured&&<div className="auth-message">Supabase connection is not configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to Vercel to enable accounts.</div>}
  <form onSubmit={submit} className="auth-form">{mode==="signup"&&<label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name" required autoComplete="name"/></label>}<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} autoComplete={mode==="login"?"current-password":"new-password"}/></label><button className="auth-submit" disabled={busy||!supabaseConfigured}>{busy?"Please wait…":mode==="login"?"Sign in":"Create account"}</button></form>
  {mode==="login"&&<button className="auth-forgot" type="button" onClick={resetPassword} disabled={busy}>Forgot password?</button>}
  {message&&<div className="auth-message" role="status">{message}</div>}<div className="auth-switch">{mode==="login"?"New to KRYORA?":"Already have an account?"} <button type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("");}}>{mode==="login"?"Create an account":"Sign in"}</button></div><Link href="/" className="auth-back">← Back to discovery</Link></section><footer className="auth-footer">A PRODUCT OF KRYPTONIA</footer></main>;
}
