 "use client";
import dynamic from "next/dynamic";
const LegacyExperience = dynamic(() => import("../src/App"), { ssr: false, loading: () => <main className="app-shell" aria-busy="true" /> });
export default function ClientHome() { return <LegacyExperience />; }
