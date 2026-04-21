"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | string>("...");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setGender(data.gender || "");
          setDob(data.dob || "");
          
          // Calculate Age dynamically!
          if (data.dob) {
            const birthDate = new Date(data.dob);
            const diff = Date.now() - birthDate.getTime();
            const ageDate = new Date(diff); 
            setAge(Math.abs(ageDate.getUTCFullYear() - 1970));
          }
        }
      }
    };
    loadUserData();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setIsUpdating(true);

    const user = auth.currentUser;
    if (!user || !user.email) return;

    try {
      // Re-authenticate with old password first!
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // If re-auth passes, update to the new password
      await updatePassword(user, newPassword);
      
      setMessage("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setMessage(""), 3000);
      
    } catch (err: any) {
      if (err.code === "auth/invalid-credential") {
        setError("Your current password is incorrect.");
      } else {
        setError("Failed to update password. Please try again.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl p-8 mt-10 shadow-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Account Profile</h1>

      {/* Profile Data (Locked) */}
      <div className="space-y-4 mb-8 bg-neutral-950/50 p-6 rounded-xl border border-neutral-800/50">
        <p className="text-xs text-amber-500 font-bold tracking-wider uppercase mb-4">Read-Only Demographics</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-1">First Name</label>
            <input type="text" disabled value={firstName} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-neutral-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-1">Last Name</label>
            <input type="text" disabled value={lastName} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-neutral-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-1">Gender</label>
            <input type="text" disabled value={gender} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-neutral-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-1">Current Age</label>
            <input type="text" disabled value={age} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-neutral-400 cursor-not-allowed" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm mb-4">{error}</motion.div>}
        {message && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-teal-500/10 text-teal-400 p-3 rounded-lg text-sm mb-4">{message}</motion.div>}
      </AnimatePresence>

      <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t border-neutral-800">
        <h2 className="text-lg font-semibold text-white mb-2">Change Password</h2>
        
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Current Password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">New Password</label>
          <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" />
        </div>

        <button type="submit" disabled={isUpdating} className="w-full bg-teal-500 text-neutral-950 font-bold py-3 rounded-lg mt-4 hover:bg-teal-400 transition-colors disabled:opacity-50">
          {isUpdating ? "Verifying..." : "Update Password"}
        </button>
      </form>
    </motion.div>
  );
}