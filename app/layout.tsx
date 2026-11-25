import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "KRYORA — Beyond Every Story", description: "Discover movies, unforgettable series, anime and animation in one place. A product of Kryptonia.", applicationName: "KRYORA", appleWebApp: { capable: true, title: "KRYORA", statusBarStyle: "black-translucent" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#090909" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
