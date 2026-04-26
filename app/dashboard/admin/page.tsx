"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

interface UserData {
  id: string; email: string; firstName: string; lastName: string; role: string; status?: string; // Added status
}

interface AppointmentData {
  id: string; studentEmail: string; doctorName: string; status: string; date?: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // NEW: Added "approvals" to the activeTab state
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "approvals">("overview");
  
  const [notification, setNotification] = useState<string | null>(null);

  const fetchUsers = async () => {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as UserData));
  };

  useEffect(() => {
    fetchUsers();

    const qApts = query(collection(db, "appointments"), orderBy("createdAt", "desc"));
    const unsubApts = onSnapshot(qApts, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AppointmentData));
      setLoading(false);
    });

    return () => unsubApts();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // --- NEW: APPROVAL FUNCTIONS --- //
  const handleApproveAccount = async (userId: string, role: string) => {
    if (!confirm(`Approve this ${role.toUpperCase()} account for medical system access?`)) return;
    try {
      await updateDoc(doc(db, "users", userId), { status: "approved" });
      showToast(`${role} account approved successfully.`);
      fetchUsers(); 
    } catch (error) {
      alert("Failed to approve account.");
    }
  };

  const handleRejectAccount = async (userId: string) => {
    if (!confirm("Reject and permanently delete this pending request?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      showToast("Pending request rejected and deleted.");
      fetchUsers(); 
    } catch (error) {
      alert("Failed to reject request.");
    }
  };

  // --- EXISTING ADMIN WRITE FUNCTIONS --- //
  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!confirm(`Change this user's role to ${newRole.toUpperCase()}?`)) return;
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      showToast("User role updated successfully.");
      fetchUsers(); 
    } catch (error) {
      alert("Failed to update user role.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("CRITICAL WARNING: Are you sure you want to permanently delete this user profile?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      showToast("User profile deleted.");
      fetchUsers(); 
    } catch (error) {
      alert("Failed to delete user.");
    }
  };

  const handleDeleteAppointment = async (aptId: string) => {
    if (!confirm("Are you sure you want to delete this appointment from the system?")) return;
    try {
      await deleteDoc(doc(db, "appointments", aptId));
      showToast("Appointment deleted.");
    } catch (error) {
      alert("Failed to delete appointment.");
    }
  };

  // Stats Calculations
  const students = users.filter(u => u.role === "student");
  // NEW: Filter out pending users for the approvals tab
  const pendingUsers = users.filter(u => u.status === "pending");
  const pendingApts = appointments.filter(a => a.status === "requested" || a.status === "scheduled");
  const completedApts = appointments.filter(a => a.status === "completed");

  return (
    <div className="space-y-8 relative max-w-7xl mx-auto">
      
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="fixed bottom-8 right-8 z-50 bg-amber-500 text-neutral-950 px-6 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border-2 border-amber-400">
            <div className="w-2 h-2 bg-neutral-950 rounded-full animate-pulse" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-neutral-800/50 pb-4 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab("overview")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "overview" ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white backdrop-blur-sm"}`}>
          System Overview
        </button>
        <button onClick={() => setActiveTab("approvals")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === "approvals" ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white backdrop-blur-sm"}`}>
          Pending Approvals
          {pendingUsers.length > 0 && <span className={`px-2 py-0.5 rounded-full text-xs text-white ${activeTab === "approvals" ? "bg-neutral-950" : "bg-red-500 animate-pulse"}`}>{pendingUsers.length}</span>}
        </button>
        <button onClick={() => setActiveTab("users")} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === "users" ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20" : "bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white backdrop-blur-sm"}`}>
          User Directory & Access
        </button>
      </div>

      {loading ? <div className="text-neutral-500 flex items-center gap-3"><div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"/> Authenticating God Mode...</div> : (
        <>
          {/* TAB 1: SYSTEM OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
                  <div className="text-4xl font-black text-white relative z-10">{users.length}</div>
                  <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-2 relative z-10">Total Accounts</div>
                </div>
                <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl">
                  <div className="text-4xl font-black text-white">{students.length}</div>
                  <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-2">Students</div>
                </div>
                <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl">
                  <div className="text-4xl font-black text-yellow-400">{pendingApts.length}</div>
                  <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-2">Active Appointments</div>
                </div>
                <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl">
                  <div className="text-4xl font-black text-emerald-400">{completedApts.length}</div>
                  <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-2">Completed Visits</div>
                </div>
              </div>

              <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" /> Live Appointment Feed
                  </h3>
                  <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Admin Write Access Active</span>
                </div>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-800">
                  {appointments.map(apt => (
                    <div key={apt.id} className="bg-neutral-950/50 border border-neutral-800/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-700 transition-colors group">
                      <div>
                        <div className="text-sm font-bold text-white">{apt.studentEmail}</div>
                        <div className="text-xs text-neutral-500 mt-1">Assigned to: {apt.doctorName} {apt.date && `• ${apt.date}`}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                          ${apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            apt.status === 'scheduled' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700'}`}>
                          {apt.status}
                        </span>
                        <button onClick={() => handleDeleteAppointment(apt.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg opacity-50 group-hover:opacity-100 transition-all" title="Delete Appointment">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {appointments.length === 0 && <div className="text-neutral-500 text-center py-8">No system activity.</div>}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: PENDING APPROVALS (NEW) */}
          {activeTab === "approvals" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-neutral-800 bg-neutral-900/40">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">Pending Medical Staff Approvals</h3>
                <p className="text-sm text-neutral-400 mt-1">Review and verify credentials before granting dashboard access to new staff.</p>
              </div>
              
              {pendingUsers.length === 0 ? (
                <div className="p-16 text-center text-neutral-500 text-lg">No pending account approvals at this time.</div>
              ) : (
                <table className="w-full text-left text-sm text-neutral-400">
                  <thead className="bg-neutral-950/80 border-b border-neutral-800 uppercase tracking-wider text-[10px] font-black text-neutral-500">
                    <tr><th className="px-8 py-5">Applicant Name</th><th className="px-8 py-5">Email</th><th className="px-8 py-5">Requested Role</th><th className="px-8 py-5 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {pendingUsers.map(user => (
                      <tr key={user.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="px-8 py-5 font-bold text-white">{user.firstName} {user.lastName}</td>
                        <td className="px-8 py-5">{user.email}</td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest ${user.role === 'doctor' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-8 py-5 flex justify-end gap-3">
                          <button onClick={() => handleRejectAccount(user.id)} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all">Reject</button>
                          <button onClick={() => handleApproveAccount(user.id, user.role)} className="px-4 py-2 bg-emerald-500 text-neutral-950 hover:bg-emerald-400 rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-500/20">Approve Access</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}

          {/* TAB 3: USER DIRECTORY (UPDATED WITH STATUS) */}
          {activeTab === "users" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-neutral-800 bg-neutral-900/40">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">System Directory</h3>
                <p className="text-sm text-amber-500 font-medium mt-1">Warning: Changing roles impacts user access immediately.</p>
              </div>
              
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/80 border-b border-neutral-800 uppercase tracking-wider text-[10px] font-black text-neutral-500">
                  <tr><th className="px-8 py-5">Name & Status</th><th className="px-8 py-5">Email</th><th className="px-8 py-5">System Role</th><th className="px-8 py-5 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-bold text-white mb-1">{user.firstName} {user.lastName}</div>
                        {/* Status Indicator */}
                        {user.status === 'pending' ? (
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Pending</span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Approved</span>
                        )}
                      </td>
                      <td className="px-8 py-5">{user.email}</td>
                      <td className="px-8 py-5">
                        <select 
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border outline-none cursor-pointer transition-colors
                            ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500' : 
                              user.role === 'doctor' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-500' : 
                              user.role === 'pharmacy' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-500' : 
                              'bg-neutral-950 text-neutral-300 border-neutral-700 hover:border-neutral-500'}`}
                        >
                          <option value="student">Student</option>
                          <option value="doctor">Doctor</option>
                          <option value="pharmacy">Pharmacy</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-neutral-950 rounded-lg text-xs font-bold transition-all"
                        >
                          Delete Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}