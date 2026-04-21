"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function AboutUs() {
  return (
    <div className="min-h-screen relative overflow-hidden pt-24 pb-12 px-6 font-sans">
      
      {/* Navigation / Back Button */}
      <div className="max-w-6xl mx-auto mb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-teal-400 transition-colors font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Home
        </Link>
      </div>

      <div className="max-w-6xl mx-auto space-y-24">
        
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-white"
          >
            Decoding <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500">
              Campus Health.
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-neutral-400 leading-relaxed font-medium"
          >
            Born out of a late-night coding session at IIT Ropar, CampusMed+ was built to solve a simple problem: getting sick as a student shouldn't be a logistical nightmare. We are entirely eliminating the waiting room.
          </motion.p>
        </section>

        {/* The "BS" Metrics Grid */}
        <section className="grid md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-3xl p-8 text-center hover:bg-neutral-900/60 transition-colors">
            <div className="text-5xl font-black text-teal-400 mb-2">0</div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Lost Prescriptions</div>
            <p className="text-xs text-neutral-600 mt-4 leading-relaxed">Our digital RX-Code system ensures that your medical data is secure, encrypted, and instantly available to the pharmacy.</p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-3xl p-8 text-center hover:bg-neutral-900/60 transition-colors">
            <div className="text-5xl font-black text-emerald-400 mb-2">10k+</div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Hours Saved</div>
            <p className="text-xs text-neutral-600 mt-4 leading-relaxed">By digitizing the FIFO queue, students no longer have to skip classes to sit in a physical waiting room.</p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-3xl p-8 text-center hover:bg-neutral-900/60 transition-colors">
            <div className="text-5xl font-black text-cyan-400 mb-2">100%</div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Open Source Spirit</div>
            <p className="text-xs text-neutral-600 mt-4 leading-relaxed">Built by students, for students. We believe campus infrastructure should be transparent, scalable, and beautifully designed.</p>
          </motion.div>
        </section>

        {/* The "Mission" Section */}
        <section className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6">The Future of <br/>Campus Clinics.</h2>
              <p className="text-neutral-400 leading-relaxed mb-6">
                Traditionally, campus healthcare operates on paper trails, verbal instructions, and endless queues. Students get sick, walk to the clinic, wait for an hour, get a handwritten note, walk to the pharmacy, and wait again.
              </p>
              <p className="text-neutral-400 leading-relaxed">
                CampusMed+ acts as a central nervous system. Students push their symptoms to a live queue. Doctors assign exact time slots, conduct the consultation, and instantly ping a digital prescription code to the pharmacy's live inventory system. It is a seamless, zero-friction loop.
              </p>
            </div>
            <div className="space-y-6">
              <div className="bg-neutral-950/50 border border-neutral-800 p-6 rounded-3xl flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0 border border-teal-500/20">
                  <span className="text-teal-400 font-black">1</span>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Request & Relax</h4>
                  <p className="text-sm text-neutral-500">Log symptoms from your dorm and get pinged when your slot is ready.</p>
                </div>
              </div>
              <div className="bg-neutral-950/50 border border-neutral-800 p-6 rounded-3xl flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0 border border-yellow-500/20">
                  <span className="text-yellow-400 font-black">2</span>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Consultation</h4>
                  <p className="text-sm text-neutral-500">Doctors manage their schedule via a live, interactive monthly calendar.</p>
                </div>
              </div>
              <div className="bg-neutral-950/50 border border-neutral-800 p-6 rounded-3xl flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <span className="text-emerald-400 font-black">3</span>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Instant Fulfillment</h4>
                  <p className="text-sm text-neutral-500">Hand over your secure RX-Code and watch the inventory auto-update.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Ready to skip the line?</h2>
          <Link href="/login?mode=signup" className="inline-block bg-white text-neutral-950 font-black px-10 py-4 rounded-full hover:scale-105 hover:shadow-xl hover:shadow-white/10 transition-all duration-300">
            Join the System
          </Link>
        </section>

      </div>
    </div>
  );
}