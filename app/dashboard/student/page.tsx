"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, getDoc, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { generatePrescriptionPDF } from "@/lib/pdfGenerator";

interface Appointment {
  id: string; date?: string; time?: string; reason: string; doctorName: string; 
  status: "requested" | "scheduled" | "completed"; prescriptionCode?: string; prescriptionNotes?: string; 
  dispensed?: boolean; dispensedAt?: any; createdAt: any;
}

export default function StudentDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State Added "prescriptions"
  const [activeTab, setActiveTab] = useState<"schedule" | "request" | "prescriptions">("schedule");

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bp, setBp] = useState("");
  const [temp, setTemp] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [studentGender, setStudentGender] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calculateBMI = () => {
  if (!height || !weight) return "--";
  const h = parseFloat(height) / 100; // convert cm to m
  const w = parseFloat(weight);
  return (w / (h * h)).toFixed(1);
  };
  useEffect(() => { 
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "appointments"), where("studentId", "==", user.uid), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const newData = change.doc.data() as Appointment;
          if (newData.status === "scheduled") {
            setNotification(`Time Assigned: ${newData.date} at ${newData.time}`);
            setTimeout(() => setNotification(null), 5000);
          } else if (newData.status === "completed" && !newData.dispensed) {
            setNotification("Prescription ready for pickup!");
            setTimeout(() => setNotification(null), 5000);
          }
        }
      });
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  // Fetch user profile data on load
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        try {
          // Assuming you save users in a "users" collection using their Auth UID as the document ID
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            
            // 1. Stitch the first and last name together
            const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
            setStudentName(fullName || auth.currentUser.displayName || "");
            
            // 2. Calculate their actual age from the 'dob' string
            let calculatedAge = "";
            if (userData.dob) {
              const birthDate = new Date(userData.dob);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              // Subtract 1 if their birthday hasn't happened yet this year
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              calculatedAge = age.toString();
            }
            setStudentAge(calculatedAge);

            // 3. Gender was already working!
            setStudentGender(userData.gender || "");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };

    // Give auth a second to initialize if needed, though usually onAuthStateChanged handles this better in production
    fetchUserProfile();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "appointments"), {
        studentId: auth.currentUser!.uid,
        studentEmail: auth.currentUser!.email,
        studentName: studentName || "Unknown", // NEW
        studentAge: studentAge || "N/A",       // NEW
        studentGender: studentGender || "N/A", // NEW
        doctorName: "Campus Clinic", 
        reason, 
        status: "requested", 
        vitals: {
        height: height || "Not provided",
        weight: weight || "Not provided",
        bmi: calculateBMI(),
        bloodPressure: bp || "Not provided",
        temperature: temp || "Not provided"
        },
        createdAt: Timestamp.now(),
      });
      setMessage("Request sent! Waiting for doctor to assign a time."); 
      setReason("");
      
      setTimeout(() => { setMessage(""); setActiveTab("schedule"); }, 2000);
    } catch (e) { setMessage("Failed to send request."); } finally { setIsSubmitting(false); }
  };

  // NEW: Handle Student Self-Procurement
  const handleMarkSelfDone = async (aptId: string) => {
    if(!confirm("Are you sure? This will remove the prescription from the campus pharmacy queue.")) return;
    try {
      await updateDoc(doc(db, "appointments", aptId), {
        dispensed: true,
        dispensedAt: Timestamp.now(),
        dispensedMethod: "self_procured" // Helps pharmacy know they didn't fill it
      });
      setNotification("Prescription marked as self-procured.");
      setTimeout(() => setNotification(null), 4000);
    } catch (e) {
      alert("Failed to update prescription status.");
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const blanks = Array.from({ length: getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth()) });
  const days = Array.from({ length: daysInMonth }).map((_, i) => i + 1);
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // Filter Prescriptions
  const allPrescriptions = appointments.filter(a => a.status === "completed" && a.prescriptionCode && a.prescriptionCode.startsWith("RX-"));
  const currentPrescriptions = allPrescriptions.filter(a => !a.dispensed);
  const pastPrescriptions = allPrescriptions.filter(a => a.dispensed);

  return (
    <div className="space-y-8 relative max-w-6xl mx-auto">
      
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="fixed bottom-8 right-8 z-50 bg-teal-500 text-neutral-950 px-6 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border-2 border-teal-400">
            <div className="w-2 h-2 bg-neutral-950 rounded-full animate-pulse" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Glass Tab Navigation */}
      <div className="flex gap-4 border-b border-neutral-800/50 pb-4 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab("schedule")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "schedule" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white backdrop-blur-sm"}`}>
          My Schedule
        </button>
        <button onClick={() => setActiveTab("request")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "request" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white backdrop-blur-sm"}`}>
          Request Appointment
        </button>
        <button onClick={() => setActiveTab("prescriptions")} className={`whitespace-nowrap flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "prescriptions" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white backdrop-blur-sm"}`}>
          My Prescriptions
          {currentPrescriptions.length > 0 && <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "prescriptions" ? "bg-neutral-950 text-teal-400" : "bg-red-500 text-white"}`}>{currentPrescriptions.length}</span>}
        </button>
      </div>

      {loading ? <div className="text-neutral-500 flex items-center gap-3"><div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/> Loading data...</div> : (
        <>
          {/* TAB 1: SCHEDULE */}
          {activeTab === "schedule" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="flex gap-4">
                  <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl px-6 py-4 text-center shadow-lg">
                    <div className="text-3xl font-black text-teal-400">{appointments.length}</div>
                    <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-1">Total Visits</div>
                  </div>
                </div>
                <div className="flex gap-6 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-full px-8 py-4 shadow-lg">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400"><div className="w-3 h-3 rounded-full bg-neutral-600 shadow-[0_0_10px_rgba(82,82,82,0.5)]"></div> Pending</div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400"><div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div> Scheduled</div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div> Completed</div>
                </div>
              </div>

              {/* Monthly Calendar */}
              <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-white">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                  <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2.5 bg-neutral-800/80 hover:bg-neutral-700 rounded-xl transition-all hover:scale-105 active:scale-95">{"<"}</button>
                    <button onClick={nextMonth} className="p-2.5 bg-neutral-800/80 hover:bg-neutral-700 rounded-xl transition-all hover:scale-105 active:scale-95">{">"}</button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-500 mb-3">
                  <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
                </div>
                
                <div className="grid grid-cols-7 gap-2 text-center">
                  {blanks.map((_, i) => <div key={`blank-${i}`} className="p-3"></div>)}
                  {days.map(day => {
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayApts = appointments.filter(a => a.date === dateStr);
                    const hasScheduled = dayApts.some(a => a.status === 'scheduled');
                    const hasCompleted = dayApts.some(a => a.status === 'completed');

                    return (
                      <div key={day} className="py-4 rounded-2xl border border-neutral-800/50 bg-neutral-950/50 relative hover:bg-neutral-800/50 hover:border-neutral-600 transition-all duration-300 h-[70px] group">
                        <div className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">{day}</div>
                        <div className="flex gap-1.5 absolute bottom-2.5 left-1/2 -translate-x-1/2">
                          {hasScheduled && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)]" />}
                          {hasCompleted && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">Your Timeline</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 relative flex flex-col hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5 hover:-translate-y-1 transition-all duration-300">
                      <div className={`absolute top-5 right-5 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border
                        ${apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          apt.status === 'scheduled' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700'}`}>
                        {apt.status}
                      </div>
                      
                      {apt.status === "requested" ? (
                        <div className="text-sm text-neutral-500 mb-2 font-bold tracking-wider uppercase">Awaiting Time</div>
                      ) : (
                        <div className="text-sm text-yellow-400 font-bold mb-2 uppercase tracking-wider drop-shadow-sm">{apt.date} at {apt.time}</div>
                      )}
                      
                      <div className="text-base text-white font-bold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        {apt.doctorName}
                      </div>
                      <div className="text-sm text-neutral-400 mb-6 flex-grow leading-relaxed">{apt.reason}</div>
                      
                      {apt.status === "completed" && apt.prescriptionCode && (
                        <div className="mt-auto pt-4 border-t border-neutral-800/50 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">RX Code</span>
                            <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded select-all shadow-inner">{apt.prescriptionCode}</span>
                          </div>
                          
                          {apt.dispensed ? (
                            <div className="text-xs font-bold text-neutral-500 bg-neutral-950/50 p-2.5 rounded-xl text-center uppercase tracking-widest border border-neutral-800/50">
                              ✓ Meds Processed
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-teal-950 bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.3)] p-2.5 rounded-xl text-center animate-pulse">
                              Ready for Pickup
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {appointments.length === 0 && <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-12 text-center text-neutral-500">No requests or appointments yet.</div>}
              </div>
            </motion.div>
          )}

          {/* TAB 2: REQUEST FORM */}
          {activeTab === "request" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 md:p-10 shadow-2xl">
              <h2 className="text-3xl font-bold text-white mb-8">Request an Appointment</h2>
              <AnimatePresence>{message && <motion.div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 p-4 rounded-xl text-sm mb-6 font-medium">{message}</motion.div>}</AnimatePresence>
              
              <form onSubmit={handleRequest} className="space-y-6">
                
                {/* NEW: Vitals Block */}
                <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl mb-2">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Digital Vitals & Biometrics
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Height */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Height (cm)</label>
                      <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 transition-colors" placeholder="175" />
                    </div>
                    
                    {/* Weight */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Weight (kg)</label>
                      <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 transition-colors" placeholder="70" />
                    </div>

                    {/* Live BMI Display */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Calculated BMI</label>
                      <div className="w-full bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-2.5 text-teal-400 font-black flex items-center justify-between">
                        {calculateBMI()}
                        <span className="text-[10px] font-bold text-teal-500 uppercase">Index</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                     <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Blood Pressure</label>
                      <input type="text" value={bp} onChange={(e) => setBp(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 transition-colors" placeholder="120/80" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Temperature</label>
                      <input type="text" value={temp} onChange={(e) => setTemp(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 transition-colors" placeholder="98.6 °F" />
                    </div>
                  </div>
                </div>

                {/* Original Symptoms Box */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Symptoms / Reason for visit</label>
                  <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Please describe how you are feeling in detail..." className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl px-5 py-4 text-white outline-none resize-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-inner placeholder:text-neutral-600" />
                </div>
                
                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-neutral-950 font-black tracking-wide py-4 rounded-2xl hover:scale-[1.02] hover:shadow-xl hover:shadow-teal-500/20 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100">
                  {isSubmitting ? "Pushing Request..." : "Submit to Doctor Queue"}
                </button>
              </form>
            </motion.div>
          )}

          {/* TAB 3: PRESCRIPTIONS (NEW!) */}
          {activeTab === "prescriptions" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
              
              {/* Active Prescriptions */}
              <section>
                <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                  Active Prescriptions
                  <span className="bg-teal-500/20 text-teal-400 text-xs py-1 px-3 rounded-full border border-teal-500/30">Action Required</span>
                </h3>
                
                {currentPrescriptions.length === 0 ? (
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-12 text-center text-neutral-500">No active prescriptions at the moment.</div>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {currentPrescriptions.map(apt => (
                      <div key={apt.id} className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 md:p-8 flex flex-col shadow-xl">
                        <div className="flex justify-between items-start border-b border-neutral-800/50 pb-6 mb-6">
                          <div>
                            <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1.5">RX Code</div>
                            <div className="text-4xl font-mono font-black text-teal-400 drop-shadow-md select-all">{apt.prescriptionCode}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">{apt.date}</div>
                            <div className="text-xs text-neutral-500 mt-1">{apt.doctorName}</div>
                          </div>
                        </div>
                        
                        <div className="mb-8">
                          <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 ml-1">Doctor's Notes / Medicines</div>
                          <div className="bg-neutral-950/50 p-5 rounded-2xl border border-neutral-800/50 text-neutral-300 font-medium leading-relaxed shadow-inner">
                            {apt.prescriptionNotes}
                          </div>
                        </div>

                        <div className="mt-auto grid md:grid-cols-2 gap-4">
                          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-center flex flex-col justify-center">
                            <span className="text-xs text-neutral-500 font-bold mb-1">Campus Pharmacy</span>
                            <span className="text-sm text-teal-400 font-bold animate-pulse">Show code at counter</span>
                          </div>
                          <div className="mt-auto grid md:grid-cols-2 gap-4">
                            {/* New PDF Button */}
                            <button onClick={() => generatePrescriptionPDF(apt)} className="bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-neutral-950 font-bold py-4 rounded-2xl transition-all border border-teal-500/30 hover:border-teal-500 text-sm flex flex-col items-center justify-center group">
                              <span>Download PDF</span>
                              <span className="text-xs font-normal text-teal-500/70 group-hover:text-teal-900 mt-0.5">Official Prescription</span>
                            </button>
                            
                            {/* Existing Self Procured Button */}
                            <button onClick={() => handleMarkSelfDone(apt.id)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-4 rounded-2xl transition-all border border-neutral-700 hover:border-neutral-500 text-sm flex flex-col items-center justify-center">
                              <span>Procured Elsewhere?</span>
                              <span className="text-xs font-normal text-neutral-500 mt-0.5">Mark as Done</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Past History Table */}
              <section>
                <h3 className="text-xl font-bold text-white mb-6">Dispensed History</h3>
                <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full scrollbar-hide">
                    <table className="w-full min-w-[800px] text-left text-sm text-neutral-400">
                      <thead className="bg-neutral-950/80 border-b border-neutral-800 uppercase tracking-wider text-[10px] font-black text-neutral-500">
                        <tr>
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Code</th>
                          <th className="px-8 py-5">Fulfillment</th>
                          <th className="px-8 py-5">Notes</th>
                          <th className="px-8 py-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50">
                        {pastPrescriptions.slice(0, 15).map(apt => (
                          <tr key={apt.id} className="hover:bg-neutral-800/40 transition-colors">
                            <td className="px-8 py-5 font-medium whitespace-nowrap text-white">{apt.date}</td>
                            <td className="px-8 py-5 font-mono text-neutral-300">{apt.prescriptionCode}</td>
                            <td className="px-8 py-5">
                              {(apt as any).dispensedMethod === "self_procured" ? (
                                 <span className="bg-neutral-800 text-neutral-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-neutral-700">Self Procured</span>
                              ) : (
                                 <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">Pharmacy</span>
                              )}
                            </td>
                            <td className="px-8 py-5 max-w-xs truncate">{apt.prescriptionNotes}</td>
                            <td className="px-8 py-5 text-right">
                              <button onClick={() => generatePrescriptionPDF(apt)} className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-teal-400 font-bold px-4 py-2 rounded-lg transition-colors uppercase tracking-widest border border-neutral-700 hover:border-teal-500/50 flex items-center gap-2 ml-auto">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pastPrescriptions.length === 0 && (
                          <tr><td colSpan={5} className="px-8 py-12 text-center text-neutral-500">No prescription history yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

            </motion.div>
          )}
        </>
      )}
    </div>
  );
}