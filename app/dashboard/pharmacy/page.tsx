"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase"; // Added auth
import { onAuthStateChanged } from "firebase/auth"; // Added for secure fetching
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, orderBy, Timestamp, deleteDoc, getDoc } from "firebase/firestore"; // Added getDoc
import { motion, AnimatePresence } from "framer-motion";

interface Prescription {
  id: string; studentEmail: string; doctorName: string; date: string; status: "completed";
  prescriptionCode: string; prescriptionNotes: string; dispensed?: boolean; dispensedAt?: any;
  dispensedMeds?: { name: string, qty: number }[];
}

interface InventoryItem {
  id: string; name: string; stock: number; maxStock: number; 
}

interface StagedMed { invId: string; name: string; qty: number; }

export default function PharmacyDashboard() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"pending" | "history" | "inventory">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const [newMedName, setNewMedName] = useState("");
  const [newMedStock, setNewMedStock] = useState("");

  const [stagedMeds, setStagedMeds] = useState<Record<string, StagedMed[]>>({});
  const [medInputs, setMedInputs] = useState<Record<string, { invId: string, qty: number }>>({});
  
  // NEW: Account Status State
  const [accountStatus, setAccountStatus] = useState("loading"); // "loading", "pending", or "approved"

  // 1. Auth & Profile Fetching (The Bouncer logic)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setAccountStatus(data.status || "pending"); 
          } else {
            setAccountStatus("pending");
          }
        } catch (error) {
          console.error("Error fetching pharmacy profile:", error);
          setAccountStatus("pending");
        }
      } else {
        setAccountStatus("pending"); 
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Pharmacy Data Fetching
  useEffect(() => {
    const qApt = query(collection(db, "appointments"), where("status", "==", "completed"), orderBy("date", "desc"));
    const unsubApt = onSnapshot(qApt, (snapshot) => {
      const validPrescriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Prescription).filter(apt => apt.prescriptionCode && apt.prescriptionCode.startsWith("RX-"));
      setPrescriptions(validPrescriptions);
    });

    const qInv = query(collection(db, "inventory"), orderBy("name", "asc"));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    });

    return () => { unsubApt(); unsubInv(); };
  }, []);

  const pendingPickups = prescriptions.filter(p => !p.dispensed);
  const dispensedHistory = prescriptions.filter(p => p.dispensed);
  const filteredPending = pendingPickups.filter(p => p.prescriptionCode.toLowerCase().includes(searchQuery.toLowerCase()) || p.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName || !newMedStock) return;
    try {
      const initStock = parseInt(newMedStock);
      await addDoc(collection(db, "inventory"), { name: newMedName, stock: initStock, maxStock: initStock });
      setNewMedName(""); setNewMedStock("");
      showToast(`Added ${newMedName} to inventory.`);
    } catch (e) { alert("Failed to add medicine."); }
  };

  const handleUpdateStock = async (invId: string, currentStock: number, change: number, currentMax: number) => {
    const newStock = Math.max(0, currentStock + change);
    const newMax = Math.max(currentMax || 0, newStock); 
    await updateDoc(doc(db, "inventory", invId), { stock: newStock, maxStock: newMax });
  };

  const handleDeleteInventory = async (invId: string) => {
    if(confirm("Are you sure you want to delete this medicine?")) {
      await deleteDoc(doc(db, "inventory", invId));
    }
  };

  const handleStageMed = (aptId: string) => {
    const input = medInputs[aptId];
    if (!input || !input.invId || !input.qty || input.qty <= 0) return alert("Select a medicine and valid quantity.");
    const medDetails = inventory.find(i => i.id === input.invId);
    if (!medDetails) return;
    if (input.qty > medDetails.stock) return alert(`Not enough stock! Only ${medDetails.stock} left.`);

    const currentStaged = stagedMeds[aptId] || [];
    setStagedMeds({ ...stagedMeds, [aptId]: [...currentStaged, { invId: medDetails.id, name: medDetails.name, qty: input.qty }] });
    setMedInputs({ ...medInputs, [aptId]: { invId: "", qty: 1 } });
  };

  const handleRemoveStagedMed = (aptId: string, index: number) => {
    const updated = [...(stagedMeds[aptId] || [])];
    updated.splice(index, 1);
    setStagedMeds({ ...stagedMeds, [aptId]: updated });
  };

  const handleDispense = async (aptId: string, rxCode: string) => {
    const medsToDispense = stagedMeds[aptId] || [];
    try {
      for (const med of medsToDispense) {
        const currentItem = inventory.find(i => i.id === med.invId);
        if (currentItem) await updateDoc(doc(db, "inventory", med.invId), { stock: currentItem.stock - med.qty });
      }
      await updateDoc(doc(db, "appointments", aptId), { 
        dispensed: true, dispensedAt: Timestamp.now(), dispensedMeds: medsToDispense.map(m => ({ name: m.name, qty: m.qty }))
      });
      setStagedMeds(prev => { const next = {...prev}; delete next[aptId]; return next; });
      setSearchQuery("");
      showToast(`Order ${rxCode} dispensed successfully.`);
    } catch (e) { alert("Critical Error: Failed to process dispensing transaction."); }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const getStockColor = (stock: number, maxStock: number) => {
    if (!maxStock || maxStock === 0) return 'bg-neutral-900 text-white border-neutral-700'; 
    const pct = (stock / maxStock) * 100;
    if (pct > 50) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (pct > 20) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'; 
  };

  // --- THE BOUNCER ---
  if (accountStatus === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-teal-500 font-bold">Verifying authorization...</div>;
  }

  if (accountStatus === "pending") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-neutral-950">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-teal-500"></div>
          <svg className="w-20 h-20 text-teal-500 mx-auto mb-6 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Access Restricted</h1>
          <p className="text-neutral-400 mb-8 leading-relaxed text-sm">
            For security compliance, all pharmacy staff accounts require manual clearance from the University Administration. Contact the admin office to expedite your approval.
          </p>
          <button onClick={() => auth.signOut()} className="w-full bg-white text-neutral-950 font-black py-3.5 rounded-xl uppercase tracking-widest hover:bg-teal-400 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    );
  }
  // --- END OF BOUNCER ---

  return (
    <div className="space-y-8 relative max-w-6xl mx-auto">
      
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="fixed bottom-8 right-8 z-50 bg-emerald-500 text-neutral-950 px-6 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border-2 border-emerald-400">
            <div className="w-2 h-2 bg-neutral-950 rounded-full animate-pulse" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 border-b border-neutral-800 pb-4 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab("pending")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "pending" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
          Pending Pickups
          {pendingPickups.length > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{pendingPickups.length}</span>}
        </button>
        <button onClick={() => setActiveTab("inventory")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "inventory" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
          Inventory Management
        </button>
        <button onClick={() => setActiveTab("history")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "history" ? "bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
          Dispensed History
        </button>
      </div>

      {loading ? <div className="text-neutral-500 flex items-center gap-3"><div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/> Loading systems...</div> : (
        <>
          {activeTab === "pending" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="relative group">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Scan or type RX Code (e.g., RX-9A2B4)..." className="w-full bg-neutral-900/80 backdrop-blur-md border-2 border-neutral-800 rounded-2xl px-6 py-5 text-xl text-white font-mono outline-none focus:border-teal-500 transition-all shadow-lg group-hover:border-neutral-700" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white font-bold transition-colors">✕ Clear</button>}
              </div>

              {filteredPending.length === 0 ? (
                 <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-16 text-center text-neutral-500 text-lg backdrop-blur-sm">
                   {searchQuery ? "No matching RX codes found." : "No pending prescriptions in the queue."}
                 </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {filteredPending.map((p) => (
                    <motion.div layout key={p.id} className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-3xl p-6 flex flex-col hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/5 hover:-translate-y-1 transition-all duration-300">
                      
                      <div className="flex justify-between items-start mb-4 border-b border-neutral-800/50 pb-4">
                        <div>
                          <div className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-1">RX Code</div>
                          <div className="text-3xl font-mono font-bold text-teal-400 select-all drop-shadow-md">{p.prescriptionCode}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white font-bold">{p.studentEmail.split('@')[0]}</div>
                          <div className="text-xs text-neutral-500">{p.date} • {p.doctorName}</div>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <div className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-2">Doctor's Notes</div>
                        <div className="text-neutral-300 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50 font-medium">
                          {p.prescriptionNotes}
                        </div>
                      </div>

                      <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl mb-6 shadow-inner">
                        <div className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-3">Fulfill Order</div>
                        
                        {(stagedMeds[p.id] || []).length > 0 && (
                          <div className="space-y-2 mb-4">
                            {stagedMeds[p.id].map((med, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-neutral-900 p-3 rounded-xl text-sm text-white border border-neutral-800 transition-all hover:border-neutral-700">
                                <span><strong className="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded mr-2">{med.qty}x</strong> {med.name}</span>
                                <button onClick={() => handleRemoveStagedMed(p.id, idx)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-colors">✕</button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <select value={medInputs[p.id]?.invId || ""} onChange={(e) => setMedInputs({ ...medInputs, [p.id]: { ...medInputs[p.id], invId: e.target.value, qty: medInputs[p.id]?.qty || 1 } })} className="flex-grow bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 transition-colors">
                            <option value="" disabled>Select Medicine...</option>
                            {inventory.map(inv => (
                              <option key={inv.id} value={inv.id} disabled={inv.stock === 0}>
                                {inv.name} ({inv.stock} in stock)
                              </option>
                            ))}
                          </select>
                          <input type="number" min="1" value={medInputs[p.id]?.qty || 1} onChange={(e) => setMedInputs({ ...medInputs, [p.id]: { ...medInputs[p.id], qty: parseInt(e.target.value) || 1 } })} className="w-20 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-center text-white outline-none focus:border-teal-500 transition-colors" />
                          <button onClick={() => handleStageMed(p.id)} className="bg-neutral-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-700 hover:shadow-lg transition-all">Add</button>
                        </div>
                      </div>

                      <button onClick={() => handleDispense(p.id, p.prescriptionCode)} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 mt-auto">
                        Handover & Mark Dispensed
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "inventory" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-3xl p-8 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6">Add New Medicine</h2>
                <form onSubmit={handleAddInventory} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-grow w-full">
                    <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Medicine Name</label>
                    <input type="text" required value={newMedName} onChange={(e) => setNewMedName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3.5 text-white outline-none focus:border-teal-500 transition-colors" />
                  </div>
                  <div className="w-full md:w-40">
                    <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Initial Stock</label>
                    <input type="number" min="0" required value={newMedStock} onChange={(e) => setNewMedStock(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3.5 text-white outline-none focus:border-teal-500 transition-colors text-center" />
                  </div>
                  <button type="submit" className="w-full md:w-auto bg-teal-500 text-neutral-950 font-bold py-3.5 px-8 rounded-xl hover:bg-teal-400 hover:shadow-lg hover:shadow-teal-500/20 transition-all">
                    Add to Database
                  </button>
                </form>
              </div>

              <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm text-neutral-300">
                  <thead className="bg-neutral-950/80 border-b border-neutral-800 uppercase tracking-wider text-xs text-neutral-500">
                    <tr><th className="px-6 py-5">Medicine Name</th><th className="px-6 py-5 text-center">Status</th><th className="px-6 py-5 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {inventory.length === 0 ? (
                       <tr><td colSpan={3} className="px-6 py-12 text-center text-neutral-500">Inventory is empty. Add medicines above.</td></tr>
                    ) : (
                      inventory.map((inv) => (
                        <tr key={inv.id} className="hover:bg-neutral-800/40 hover:scale-[1.01] transition-all duration-200 group">
                          <td className="px-6 py-4 text-white font-bold text-base">{inv.name}</td>
                          <td className="px-6 py-4 text-center">
                            {/* COLOR REACTIVE STATUS PILL */}
                            <span className={`px-4 py-1.5 rounded-full font-bold border ${getStockColor(inv.stock, inv.maxStock)}`}>
                              {inv.stock} in stock
                            </span>
                          </td>
                          <td className="px-6 py-4 flex justify-end gap-2 items-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleUpdateStock(inv.id, inv.stock, -1, inv.maxStock)} className="w-9 h-9 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-transform hover:scale-110 active:scale-95">-</button>
                            <button onClick={() => handleUpdateStock(inv.id, inv.stock, 1, inv.maxStock)} className="w-9 h-9 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-transform hover:scale-110 active:scale-95">+</button>
                            <div className="w-px h-8 bg-neutral-800 mx-2"></div>
                            <button onClick={() => handleDeleteInventory(inv.id)} className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors">Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm text-neutral-300">
                <thead className="bg-neutral-950/80 border-b border-neutral-800 uppercase tracking-wider text-xs text-neutral-500">
                  <tr><th className="px-6 py-5">Status</th><th className="px-6 py-5">RX Code</th><th className="px-6 py-5">Student</th><th className="px-6 py-5">Items Dispensed</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {dispensedHistory.slice(0, 20).map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4"><span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">Dispensed</span></td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400 text-base">{p.prescriptionCode}</td>
                      <td className="px-6 py-4 text-white font-medium">{p.studentEmail.split('@')[0]}</td>
                      <td className="px-6 py-4">
                        {p.dispensedMeds && p.dispensedMeds.length > 0 ? (
                           <div className="space-y-1.5">
                             {p.dispensedMeds.map((m, i) => (
                               <div key={i} className="flex items-center gap-2"><span className="bg-neutral-800 text-teal-400 px-2 py-0.5 rounded font-bold text-xs">{m.qty}x</span> <span className="text-neutral-300 font-medium">{m.name}</span></div>
                             ))}
                           </div>
                        ) : <span className="text-neutral-600 italic">No physical meds given</span>}
                      </td>
                    </tr>
                  ))}
                  {dispensedHistory.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-neutral-500">No dispensing history yet.</td></tr>}
                </tbody>
              </table>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}