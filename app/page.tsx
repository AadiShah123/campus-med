"use client"; 

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Home() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) setUserRole(userDoc.data().role);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    // Added a deep, reactive radial gradient background
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-teal-500/30 relative overflow-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation Bar */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold tracking-tighter text-teal-400">
          CampusMed+
        </div>
        
        <div className="flex items-center space-x-6">
          <Link href="/about" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            About Us
          </Link>

          {loading ? (
            <div className="text-sm text-neutral-500 animate-pulse">Checking session...</div>
          ) : userRole ? (
            <Link href={`/dashboard/${userRole}`} className="text-sm font-medium bg-teal-500 text-neutral-950 px-5 py-2.5 rounded-full hover:bg-teal-400 hover:shadow-lg hover:shadow-teal-500/20 transition-all">
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-sm font-medium hover:text-teal-400 transition-colors">
                Log In
              </Link>
              <Link href="/login?mode=signup" className="text-sm font-medium bg-white text-black px-5 py-2.5 rounded-full hover:bg-neutral-200 transition-colors">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-32 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-6 leading-tight">
            Campus Healthcare, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-500 drop-shadow-sm">
              Simplified.
            </span>
          </h1>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12 leading-relaxed">
          Book appointments and order prescriptions directly from the campus clinic. Bridging the gap between students and medical facilities.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}>
          {userRole ? (
            <Link href={`/dashboard/${userRole}`} className="inline-block bg-teal-500 text-neutral-950 px-8 py-4 rounded-full font-bold text-lg hover:bg-teal-400 hover:scale-105 hover:shadow-xl hover:shadow-teal-500/20 transition-all duration-300">
              Enter Dashboard
            </Link>
          ) : (
            <Link href="/login?mode=signup" className="inline-block bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 hover:shadow-xl hover:shadow-white/10 transition-all duration-300">
              Get Started
            </Link>
          )}
        </motion.div>
      </main>
    </div>
  );
}