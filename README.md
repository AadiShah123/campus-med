# CampusMed+ | 3-Sided Healthcare Marketplace

A full-stack, real-time medical management system designed for campus clinics. This project demonstrates a complete "Circle of Care" workflow between Students, Doctors, and Pharmacists.

**Live Demo:** [YOUR_VERCEL_URL_HERE]

## 🛠️ Tech Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion
- **Backend/Database:** Firebase (Firestore, Authentication)
- **Deployment:** Vercel

## 🏗️ The 3-Sided Workflow
- **Student Portal:** Real-time appointment requests, live status tracking, and digital prescription (RX) management.
- **Doctor Dashboard:** FIFO queue management, interactive monthly calendar for scheduling, and digital prescription issuance.
- **Pharmacy Hub:** Live inventory management with color-reactive stock levels and secure RX-code fulfillment.

## 🚀 Key Technical Features
- **Real-time Sync:** Uses Firestore `onSnapshot` for instant updates across all user types without page refreshes.
- **Role-Based Access Control (RBAC):** Custom middleware and Firestore-backed authentication to ensure data privacy.
- **Glassmorphism UI:** Modern, responsive design utilizing radial mesh gradients and backdrop blurs.
- **FIFO Logic:** Automated request queuing to streamline clinic operations.

## 📈 Database Schema
- `users`: Stores profiles and roles (Student, Doctor, Pharmacy, Admin).
- `appointments`: Tracks the lifecycle of a medical visit (Requested → Scheduled → Completed → Dispensed).
- `inventory`: Real-time tracking of medications with automated stock deduction.
