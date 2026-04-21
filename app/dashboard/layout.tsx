"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().firstName);
          setUserRole(userDoc.data().role);
        }
        setLoading(false);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-teal-500 font-bold">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Loading CampusMed+...
        </div>
      </div>
    );
  }

  return (
    // REMOVED the solid 'bg-neutral-950' so the global mesh gradient shines through!
    <div className="min-h-screen text-neutral-50 font-sans">
      
      {/* Glassmorphism Navigation Header */}
      <nav className="bg-neutral-950/40 backdrop-blur-xl border-b border-neutral-800/50 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={`/dashboard/${userRole}`} className="text-xl font-bold text-teal-400 drop-shadow-md hover:text-teal-300 transition-colors">
              CampusMed+ <span className="text-xs text-teal-500/70 font-black ml-2 uppercase tracking-widest px-2 py-1 bg-teal-500/10 rounded-full border border-teal-500/20">{userRole}</span>
            </Link>
            
            {/* Nav Links */}
            <div className="hidden md:flex space-x-6">
              <Link href={`/dashboard/${userRole}`} className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/profile" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
                My Info
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-sm text-neutral-400">Hello, <strong className="text-white drop-shadow-sm">{userName}</strong></span>
            <button 
              onClick={handleLogout}
              className="text-sm font-bold bg-red-500/10 text-red-500 px-5 py-2.5 rounded-xl hover:bg-red-500 hover:text-neutral-950 transition-all hover:shadow-lg hover:shadow-red-500/20"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* The actual page content renders here */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}