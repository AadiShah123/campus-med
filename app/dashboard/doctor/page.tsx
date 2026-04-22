"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { generatePrescriptionPDF } from "@/lib/pdfGenerator";

interface Appointment {
  id: string; studentEmail: string; date?: string; time?: string; reason: string; doctorName?: string;
  status: "requested" | "scheduled" | "completed"; prescriptionCode?: string; prescriptionNotes?: string; createdAt: any;
  vitals?: { height: string; weight: string; bmi: string; bloodPressure: string; temperature: string; };
}

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // NEW TAB ADDED: consultation
  const [activeTab, setActiveTab] = useState<"queue" | "calendar" | "consultation">("queue");
  
  const [selectedRequest, setSelectedRequest] = useState<Appointment | null>(null);
  const [selectedDayApts, setSelectedDayApts] = useState<Appointment[] | null>(null);
  const [activeDayStr, setActiveDayStr] = useState<string>("");
  
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rescheduleData, setRescheduleData] = useState<Record<string, {date: string, time: string}>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchAppointments = async () => {
    try {
      const q = query(collection(db, "appointments"), orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const requestedApts = appointments.filter(a => a.status === "requested");
  const scheduledApts = appointments.filter(a => a.status === "scheduled"); // Active Patients

  const handleAssignTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setIsUpdating(true);
    try {
      // Also assign the current doctor's email to the appointment
      await updateDoc(doc(db, "appointments", selectedRequest.id), { 
        status: "scheduled", date: newDate, time: newTime, doctorName: auth.currentUser?.displayName || "Dr. d", // Or whatever the doctor's name is 
        doctorEmail: auth.currentUser?.email // NEW: Grabs the logged-in doctor's email 
      });
      setSelectedRequest(null); setNewDate(""); setNewTime(""); fetchAppointments();
    } catch (e) { alert("Failed to schedule."); } finally { setIsUpdating(false); }
  };

  const handleReschedule = async (aptId: string) => {
    const data = rescheduleData[aptId];
    if (!data || !data.date || !data.time) return alert("Please select a valid date and time.");
    try {
      await updateDoc(doc(db, "appointments", aptId), { date: data.date, time: data.time });
      fetchAppointments(); setSelectedDayApts(null); 
    } catch (e) { alert("Failed to reschedule"); }
  };

  const handleComplete = async (aptId: string) => {
    const currentNote = (notes[aptId] || "").trim();
    const isNotesEmpty = currentNote === "";
    let finalCode = null;

    if (!isNotesEmpty) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      finalCode = 'RX-';
      for (let i = 0; i < 5; i++) finalCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    try {
      await updateDoc(doc(db, "appointments", aptId), { 
        status: "completed", prescriptionNotes: isNotesEmpty ? "N/A" : currentNote, prescriptionCode: finalCode 
      });
      setNotes(prev => { const next = { ...prev }; delete next[aptId]; return next; });
      fetchAppointments();
      alert("Consultation completed and PDF is ready for the student.");
    } catch (e) { alert("Failed to complete"); }
  };

  // Calendar Math
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const blanks = Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() });
  const days = Array.from({ length: daysInMonth }).map((_, i) => i + 1);
  const openDayView = (dateStr: string) => {
    const apts = appointments.filter(a => a.date === dateStr);
    setActiveDayStr(dateStr);
    setSelectedDayApts(apts);
  };
  return (
    <div className="space-y-8">
      
      {/* Modern Tab System */}
      <div className="flex gap-4 border-b border-neutral-800 pb-4 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab("queue")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "queue" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
          FIFO Request Queue
          {requestedApts.length > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{requestedApts.length}</span>}
        </button>
        <button onClick={() => setActiveTab("calendar")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "calendar" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
          Monthly Schedule
        </button>
        <button onClick={() => setActiveTab("consultation")} className={`whitespace-nowrap flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "consultation" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
          Active Consultations
          {scheduledApts.length > 0 && <span className={`w-2 h-2 rounded-full ${activeTab === "consultation" ? "bg-neutral-950" : "bg-teal-500 animate-pulse"}`}></span>}
        </button>
      </div>

      {loading ? <div className="text-neutral-500">Loading system...</div> : (
        <>
          {/* TAB 1: QUEUE (Remains the same) */}
          {activeTab === "queue" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Pending Student Requests</h2>
              {requestedApts.length === 0 ? (
                 <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">Queue is clear.</div>
              ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm text-neutral-400">
                    <thead className="bg-neutral-950/50 border-b border-neutral-800 uppercase tracking-wider text-xs">
                      <tr><th className="px-6 py-4">Student</th><th className="px-6 py-4">Symptoms</th><th className="px-6 py-4 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {requestedApts.map((req) => (
                        <tr key={req.id} className="hover:bg-neutral-800/50 transition-colors">
                          <td className="px-6 py-4 text-white font-medium">{req.studentEmail.split('@')[0]}</td>
                          <td className="px-6 py-4 max-w-md truncate">{req.reason}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setSelectedRequest(req)} className="bg-teal-500/10 text-teal-400 px-4 py-2 rounded-lg font-bold hover:bg-teal-500 hover:text-neutral-950 transition-colors">Assign Time</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: CONSULTATION ROOM (NEW EHR VIEW) */}
          {activeTab === "consultation" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-2">Patients Waiting for Consultation</h2>
              {scheduledApts.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">No scheduled patients at the moment.</div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {scheduledApts.sort((a,b) => (a.date || "").localeCompare(b.date || "")).map(apt => (
                    <div key={apt.id} className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl flex flex-col">
                      <div className="flex justify-between items-start border-b border-neutral-800/50 pb-4 mb-4">
                        <div>
                          <div className="text-xs text-yellow-400 font-bold uppercase tracking-widest mb-1">Scheduled Visit</div>
                          <div className="text-xl font-bold text-white">{apt.studentEmail.split('@')[0]}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">{apt.date}</div>
                          <div className="text-xs text-neutral-500">{apt.time}</div>
                        </div>
                      </div>

                      {/* Vitals & Symptoms */}
                      {apt.vitals && (
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-4 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50 shadow-inner">
                           <div className="flex items-center gap-1.5"><span className="text-neutral-500 font-bold uppercase">HT</span><span className="text-white font-medium">{apt.vitals.height}</span></div>
                           <div className="flex items-center gap-1.5"><span className="text-neutral-500 font-bold uppercase">WT</span><span className="text-white font-medium">{apt.vitals.weight}</span></div>
                           <div className="flex items-center gap-1.5"><span className="text-neutral-500 font-bold uppercase">BMI</span><span className="text-teal-400 font-bold">{apt.vitals.bmi}</span></div>
                           <div className="flex items-center gap-1.5"><span className="text-neutral-500 font-bold uppercase">BP</span><span className="text-red-400 font-bold">{apt.vitals.bloodPressure}</span></div>
                           <div className="flex items-center gap-1.5"><span className="text-neutral-500 font-bold uppercase">TEMP</span><span className="text-orange-400 font-bold">{apt.vitals.temperature}</span></div>
                        </div>
                      )}
                      <div className="text-sm text-neutral-400 mb-6 italic border-l-2 border-neutral-800 pl-3">"{apt.reason}"</div>
                      
                      {/* Doctor Notes & Complete Button */}
                      <div className="mt-auto bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                        <label className="text-[10px] text-teal-500 font-black uppercase tracking-widest mb-2 block ml-1">Generate E-Prescription</label>
                        <textarea 
                          value={notes[apt.id] || ""} 
                          onChange={(e) => setNotes({...notes, [apt.id]: e.target.value})} 
                          placeholder="Write treatment plan and required medicines here..." 
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none mb-3 focus:border-teal-500 transition-colors shadow-inner" 
                          rows={4}
                        />
                        <div className="flex gap-3">
                           <button onClick={() => handleComplete(apt.id)} className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-neutral-950 py-3 rounded-xl text-sm font-black tracking-wide hover:shadow-lg hover:shadow-teal-500/20 transition-all hover:-translate-y-0.5">
                             Sign & Complete
                           </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: CALENDAR (Read & Reschedule Only) */}
          {activeTab === "calendar" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-white">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">{"<"}</button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">{">"}</button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-500 mb-2"><div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div></div>
              <div className="grid grid-cols-7 gap-2 text-center">
                {blanks.map((_, i) => <div key={`blank-${i}`} className="p-4"></div>)}
                {days.map(day => {
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayApts = appointments.filter(a => a.date === dateStr);
                  const scheduledCount = dayApts.filter(a => a.status === 'scheduled').length;
                  const completedCount = dayApts.filter(a => a.status === 'completed').length;
                  return (
                    <button key={day} onClick={() => openDayView(dateStr)} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 relative hover:border-teal-500/50 transition-colors flex flex-col items-center justify-center min-h-[80px]">
                      <div className="text-sm font-bold text-neutral-300 mb-1">{day}</div>
                      <div className="flex gap-1 mt-auto">
                        {scheduledCount > 0 && <div className="w-5 h-5 flex items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-neutral-900">{scheduledCount}</div>}
                        {completedCount > 0 && <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-neutral-900">{completedCount}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* MODAL 1: Assign Time */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-8 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
               <h3 className="text-2xl font-bold text-white mb-2">Assign Time Slot</h3>
               <p className="text-sm text-neutral-400 mb-6 flex items-center justify-between">
                 <span>Patient: <strong className="text-white">{selectedRequest.studentEmail}</strong></span>
                 <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-bold uppercase tracking-wider">Awaiting Triage</span>
               </p>
               {selectedRequest.vitals && (
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-center"><span className="block text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">Height</span><span className="text-white text-xs font-bold">{selectedRequest.vitals.height} {selectedRequest.vitals.height !== "Not provided" && "cm"}</span></div>
                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-center"><span className="block text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">Weight</span><span className="text-white text-xs font-bold">{selectedRequest.vitals.weight} {selectedRequest.vitals.weight !== "Not provided" && "kg"}</span></div>
                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-center bg-teal-500/5"><span className="block text-[9px] text-teal-500 uppercase tracking-widest font-black mb-1">BMI</span><span className="text-teal-400 text-xs font-bold">{selectedRequest.vitals.bmi}</span></div>
                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-center"><span className="block text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">BP</span><span className="text-red-400 text-xs font-bold">{selectedRequest.vitals.bloodPressure}</span></div>
                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-center"><span className="block text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">Temp</span><span className="text-orange-400 text-xs font-bold">{selectedRequest.vitals.temperature}</span></div>
                  </div>
                )}
               <div className="bg-neutral-950 p-4 rounded-xl text-sm text-neutral-300 mb-6 border border-neutral-800 shadow-inner">
                 <span className="text-xs text-neutral-500 block mb-2 uppercase font-black tracking-wider">Reported Symptoms</span>
                 {selectedRequest.reason}
               </div>
               <form onSubmit={handleAssignTime} className="space-y-4">
                 <div className="flex gap-4">
                   <div className="w-1/2">
                     <label className="block text-sm font-medium text-neutral-400 mb-1">Date</label>
                     <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white outline-none" style={{ colorScheme: "dark" }} />
                   </div>
                   <div className="w-1/2">
                     <label className="block text-sm font-medium text-neutral-400 mb-1">Time</label>
                     <input type="time" required value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white outline-none" style={{ colorScheme: "dark" }} />
                   </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setSelectedRequest(null)} className="w-1/2 bg-neutral-800 text-white font-bold py-3 rounded-lg hover:bg-neutral-700">Cancel</button>
                   <button type="submit" disabled={isUpdating} className="w-1/2 bg-teal-500 text-neutral-950 font-bold py-3 rounded-lg hover:bg-teal-400 disabled:opacity-50">Confirm Slot</button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Day View (Calendar - Read Only & Reschedule) */}
      <AnimatePresence>
        {selectedDayApts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-8 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Agenda for {activeDayStr}</h3>
                <button onClick={() => setSelectedDayApts(null)} className="text-neutral-500 hover:text-white font-bold">✕ Close</button>
              </div>

              {selectedDayApts.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">No appointments on this day.</div>
              ) : (
                <div className="space-y-6">
                  {selectedDayApts.sort((a,b) => (a.time || "").localeCompare(b.time || "")).map(apt => (
                    <div key={apt.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase mr-3 ${apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{apt.status}</span>
                          <span className="text-white font-bold">{apt.time} - {apt.studentEmail.split('@')[0]}</span>
                        </div>
                        <button onClick={() => generatePrescriptionPDF(apt)} className="text-xs text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/20 font-bold transition-colors">Print PDF</button>
                      </div>
                      
                      {apt.status === "scheduled" && (
                         <div className="flex items-center gap-2 bg-neutral-900 p-2 rounded-lg border border-neutral-800">
                             <input type="date" value={rescheduleData[apt.id]?.date || ""} onChange={(e) => setRescheduleData({...rescheduleData, [apt.id]: {...rescheduleData[apt.id], date: e.target.value}})} className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm text-white" style={{ colorScheme: "dark" }} />
                             <input type="time" value={rescheduleData[apt.id]?.time || ""} onChange={(e) => setRescheduleData({...rescheduleData, [apt.id]: {...rescheduleData[apt.id], time: e.target.value}})} className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm text-white" style={{ colorScheme: "dark" }} />
                             <button onClick={() => handleReschedule(apt.id)} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded transition-colors">Reschedule</button>
                          </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}