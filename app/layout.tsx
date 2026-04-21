import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. This controls the Browser Tab Title and Search Engine text
export const metadata: Metadata = {
  title: "CampusMed+ | University Healthcare",
  description: "Streamlined campus clinic appointments and pharmacy management.",
  // Next.js automatically looks for a file named "icon.png" or "favicon.ico" in your app/ folder for the logo!
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-neutral-950 text-neutral-50 relative min-h-screen selection:bg-teal-500/30`}>
        
        {/* 2. Pure CSS Animated Mesh Gradient Background! No downloads required. */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-cyan-500/5 blur-[100px] rounded-full mix-blend-screen" />
          {/* Subtle noise overlay for texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>

        {/* The actual app content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}