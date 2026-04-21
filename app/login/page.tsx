"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Added router back!
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore"; // Added getDoc back!
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const router = useRouter(); // Initialized router
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState(""); 
  const [role, setRole] = useState("student"); 
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(""); 
  const [showForgot, setShowForgot] = useState(false); 

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "signup") setIsLogin(false);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(""); 

    if (!isLogin && !email.endsWith("@iitrpr.ac.in")) {
      setError("Access restricted. Use a valid @iitrpr.ac.in email address.");
      return;
    }

    try {
      if (isLogin) {
        // Log the user in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setSuccess("Logged in successfully! Redirecting...");
        
        // Fetch their role from the database to know where to send them
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          router.push(`/dashboard/${userData.role}`); // Actually redirect them!
        } else {
          setError("User profile not found in database.");
        }
        
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // God Mode Trap Door: Force 'admin' role for this specific email
        const finalRole = email.toLowerCase() === "admin@iitrpr.ac.in" ? "admin" : role;

        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          firstName: finalRole === "admin" ? "System" : firstName,
          lastName: finalRole === "admin" ? "Admin" : lastName,
          gender: finalRole === "admin" ? "N/A" : gender,
          dob: finalRole === "admin" ? "1970-01-01" : dob, 
          role: finalRole,
          createdAt: new Date(),
        });
        
        setSuccess(`Account created for ${firstName}! You can now log in.`);
      }
    } catch (err: any) {
      let cleanErrorMessage = "An unexpected error occurred.";
      if (err.code === "auth/email-already-in-use") cleanErrorMessage = "Email already registered.";
      if (err.code === "auth/invalid-credential") cleanErrorMessage = "Incorrect email or password.";
      if (err.code === "auth/weak-password") cleanErrorMessage = "Password must be at least 6 characters.";
      setError(cleanErrorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-neutral-50 font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center text-teal-400">
          {isLogin ? "Welcome Back" : "Join CampusMed+"}
        </h2>

        <AnimatePresence>
          {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm mb-4">{error}</motion.div>}
          {showForgot && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-amber-500/10 text-amber-400 p-3 rounded-lg text-sm mb-4 border border-amber-500/20 text-center font-medium">Try contacting <a href="mailto:admin@iitrpr.ac.in" className="underline hover:text-amber-300">admin@iitrpr.ac.in</a> to reset password.</motion.div>}
        </AnimatePresence>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Campus Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" />
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                <div className="flex gap-4 pt-2">
                  <div className="w-1/2">
                    <label className="block text-sm text-neutral-400 mb-1">First Name</label>
                    <input type="text" required={!isLogin} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm text-neutral-400 mb-1">Last Name</label>
                    <input type="text" required={!isLogin} value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm text-neutral-400 mb-1">Date of Birth</label>
                    <input type="date" required={!isLogin} value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none" style={{ colorScheme: "dark" }} />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm text-neutral-400 mb-1">Gender</label>
                    <select required={!isLogin} value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none appearance-none">
                      <option value="" disabled>Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-1">I am a...</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none appearance-none">
                    <option value="student">Student</option>
                    <option value="doctor">Doctor</option>
                    <option value="pharmacy">Pharmacy Staff</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLogin && (
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowForgot(!showForgot)} className="text-xs text-neutral-500 hover:text-teal-400 transition-colors">Forgot Password?</button>
            </div>
          )}

          <button type="submit" className="w-full bg-teal-500 text-neutral-950 font-bold py-3 rounded-lg mt-4 hover:bg-teal-400 transition-colors">
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <AnimatePresence>
          {success && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="mt-4 bg-teal-500/10 text-teal-400 p-3 rounded-lg text-sm text-center font-medium">{success}</motion.div>}
        </AnimatePresence>

        <p className="text-center mt-6 text-sm text-neutral-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); setShowForgot(false); }} className="text-teal-400 hover:text-teal-300 font-medium">
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}