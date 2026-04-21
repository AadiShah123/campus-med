"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

interface Appointment {
  id: string; studentEmail: string; date?: string; time?: string; reason: string; 
  status: "requested" | "scheduled" | "completed"; prescriptionCode?: string; prescriptionNotes?: string; createdAt: any;
}

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "calendar">("queue");
  
  const [selectedRequest, setSelectedRequest] = useState<Appointment | null>(null);
  const [selectedDayApts, setSelectedDayApts] = useState<Appointment[] | null>(null);
  const [activeDayStr, setActiveDayStr] = useState<string>("");
  
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // FIXED: State Dictionary Maps to prevent shared-state overlap in modals
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

  const handleAssignTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "appointments", selectedRequest.id), { status: "scheduled", date: newDate, time: newTime });
      setSelectedRequest(null); setNewDate(""); setNewTime(""); fetchAppointments();
    } catch (e) { alert("Failed to schedule."); } finally { setIsUpdating(false); }
  };

  const handleReschedule = async (aptId: string) => {
    const data = rescheduleData[aptId];
    if (!data || !data.date || !data.time) return alert("Please select a valid date and time.");
    
    try {
      await updateDoc(doc(db, "appointments", aptId), { date: data.date, time: data.time });
      fetchAppointments();
      setSelectedDayApts(null); 
    } catch (e) { alert("Failed to reschedule"); }
  };

  const handleComplete = async (aptId: string) => {
    // Fetch the specific note for THIS appointment ID
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
        status: "completed", 
        prescriptionNotes: isNotesEmpty ? "N/A" : currentNote, 
        prescriptionCode: finalCode 
      });
      
      // Clean up the dictionary state after success
      setNotes(prev => {
        const next = { ...prev };
        delete next[aptId];
        return next;
      });

      fetchAppointments(); 
      setSelectedDayApts(null);
    } catch (e) { alert("Failed to complete"); }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const blanks = Array.from({ length: getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth()) });
  const days = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

  const openDayView = (dateStr: string) => {
    const apts = appointments.filter(a => a.date === dateStr);
    setActiveDayStr(dateStr);
    setSelectedDayApts(apts);
  };

  return (
    <div className="space-y-8">
      
      <div className="flex gap-4 border-b border-neutral-800 pb-4">
        <button onClick={() => setActiveTab("queue")} className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${activeTab === "queue" ? "bg-teal-500 text-neutral-950" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}>
          FIFO Request Queue
          {requestedApts.length > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{requestedApts.length}</span>}
        </button>
        <button onClick={() => setActiveTab("calendar")} className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${activeTab === "calendar" ? "bg-teal-500 text-neutral-950" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}>
          Monthly Schedule
        </button>
      </div>

      {loading ? <div className="text-neutral-500">Loading system...</div> : (
        <>
          {activeTab === "queue" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Pending Student Requests</h2>
              {requestedApts.length === 0 ? (
                 <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">No pending requests! Queue is clear.</div>
              ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm text-neutral-400">
                    <thead className="bg-neutral-950/50 border-b border-neutral-800 uppercase tracking-wider text-xs">
                      <tr><th className="px-6 py-4">Student</th><th className="px-6 py-4">Symptoms</th><th className="px-6 py-4 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {requestedApts.map((req) => (
                        <tr key={req.id} className="hover:bg-neutral-800/50 transition-colors">
                          <td className="px-6 py-4 text-white font-medium">{req.studentEmail.split('@')[0]}</td>
                          <td className="px-6 py-4 max-w-md truncate">{req.reason}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setSelectedRequest(req)} className="bg-teal-500/10 text-teal-400 px-4 py-2 rounded-lg font-bold hover:bg-teal-500 hover:text-neutral-950 transition-colors">
                              Assign Time
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "calendar" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs text-neutral-400"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Scheduled</div>
                  <div className="flex items-center gap-2 text-xs text-neutral-400"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Completed</div>
                </div>
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-white">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">{"<"}</button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">{">"}</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-500 mb-2">
                <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-center">
                {blanks.map((_, i) => <div key={`blank-${i}`} className="p-4"></div>)}
                {days.map(day => {
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayApts = appointments.filter(a => a.date === dateStr);
                  
                  const scheduledCount = dayApts.filter(a => a.status === 'scheduled').length;
                  const completedCount = dayApts.filter(a => a.status === 'completed').length;

                  return (
                    <button 
                      key={day} 
                      onClick={() => openDayView(dateStr)}
                      className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 relative hover:border-teal-500/50 transition-colors flex flex-col items-center justify-center min-h-[80px]"
                    >
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2">Assign Time Slot</h3>
              <p className="text-sm text-neutral-400 mb-6">Patient: <strong className="text-white">{selectedRequest.studentEmail}</strong></p>
              
              <div className="bg-neutral-950 p-4 rounded-lg text-sm text-neutral-300 mb-6 border border-neutral-800">
                <span className="text-xs text-neutral-500 block mb-1 uppercase font-bold tracking-wider">Reported Symptoms</span>
                {selectedRequest.reason}
              </div>

              <form onSubmit={handleAssignTime} className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-neutral-400 mb-1">Date</label>
                    <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" style={{ colorScheme: "dark" }} />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-neutral-400 mb-1">Time</label>
                    <input type="time" required value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" style={{ colorScheme: "dark" }} />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setSelectedRequest(null)} className="w-1/2 bg-neutral-800 text-white font-bold py-3 rounded-lg hover:bg-neutral-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={isUpdating} className="w-1/2 bg-teal-500 text-neutral-950 font-bold py-3 rounded-lg hover:bg-teal-400 transition-colors disabled:opacity-50">Confirm Slot</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Day View Planner */}
      <AnimatePresence>
        {selectedDayApts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto">
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
                      </div>
                      
                      {apt.status === "scheduled" && (
                        <div className="space-y-4">
                          
                          {/* Reschedule Block (Independent State) */}
                          <div className="flex items-center gap-2 bg-neutral-900 p-2 rounded-lg border border-neutral-800">
                             <input type="date" value={rescheduleData[apt.id]?.date || ""} onChange={(e) => setRescheduleData({...rescheduleData, [apt.id]: {...rescheduleData[apt.id], date: e.target.value}})} className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm text-white" style={{ colorScheme: "dark" }} />
                             <input type="time" value={rescheduleData[apt.id]?.time || ""} onChange={(e) => setRescheduleData({...rescheduleData, [apt.id]: {...rescheduleData[apt.id], time: e.target.value}})} className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm text-white" style={{ colorScheme: "dark" }} />
                             <button onClick={() => handleReschedule(apt.id)} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded transition-colors">Reschedule</button>
                          </div>
                          
                          {/* Complete Block (Independent State) */}
                          <div className="border-t border-neutral-800 pt-4">
                            <textarea 
                              value={notes[apt.id] || ""} 
                              onChange={(e) => setNotes({...notes, [apt.id]: e.target.value})} 
                              placeholder="Write prescription here to mark as complete (Leave blank if none)..." 
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none mb-2 focus:border-teal-500 transition-colors" 
                              rows={2}
                            />
                            <button onClick={() => handleComplete(apt.id)} className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500 hover:text-neutral-950 transition-colors">
                              Mark Completed
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {apt.status === "completed" && (
                         <div className="text-sm text-neutral-400 bg-neutral-900 p-3 rounded-lg">
                           {apt.prescriptionCode && <span className="text-emerald-400 font-mono font-bold mr-2">{apt.prescriptionCode}</span>} 
                           {apt.prescriptionNotes}
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