import { jsPDF } from "jspdf";

export const generatePrescriptionPDF = (apt: any) => {
  const doc = new jsPDF();

  // 1. Header (Clinic Name)
  doc.setFontSize(24);
  doc.setTextColor(20, 184, 166); // Teal color
  doc.text("CampusMed+ Clinic", 20, 25);

  // 2. Doctor Details
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100); // Gray
  doc.text(`Attending Physician: ${apt.doctorName || "Campus Doctor"}`, 20, 35);
  doc.text(`Physician Email: ${apt.doctorEmail || "doctor@iitrpr.ac.in"}`, 20, 41);
  doc.text(`Consultation Date: ${apt.date} at ${apt.time}`, 20, 47);

  // Divider Line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 52, 190, 52);

  // 3. Patient Details
  doc.setTextColor(0, 0, 0); // Black text
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", 20, 62);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Name: ${apt.studentName || "Not Provided"}`, 20, 70);
  doc.text(`Age: ${apt.studentAge || "--"}   |   Gender: ${apt.studentGender || "--"}`, 120, 70);
  doc.text(`Student ID / Email: ${apt.studentEmail}`, 20, 77);
  
  if (apt.vitals) {
    doc.text(`Height: ${apt.vitals.height}${apt.vitals.height !== "Not provided" ? "cm" : ""}   |   Weight: ${apt.vitals.weight}${apt.vitals.weight !== "Not provided" ? "kg" : ""}   |   BMI: ${apt.vitals.bmi}`, 20, 85);
    doc.text(`Blood Pressure: ${apt.vitals.bloodPressure}   |   Temperature: ${apt.vitals.temperature}`, 20, 92);
  }

  // 4. Clinical Notes & Symptoms
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Reported Symptoms", 20, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const symptomLines = doc.splitTextToSize(apt.reason || "N/A", 170);
  doc.text(symptomLines, 20, 113);

  // 5. The Prescription (Rx)
  const rxYStart = 113 + (symptomLines.length * 6) + 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Rx: Treatment & Medicines", 20, rxYStart);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const rxLines = doc.splitTextToSize(apt.prescriptionNotes || "No specific medicines prescribed.", 170);
  doc.text(rxLines, 20, rxYStart + 8);

  // 6. Pharmacy Fulfillment Code
  const footerY = 260;
  doc.setDrawColor(16, 185, 129); // Emerald border
  doc.setLineWidth(0.5);
  doc.rect(20, footerY - 10, 170, 20); // Box around the code
  doc.setFontSize(12);
  doc.text("Official Campus Pharmacy Fulfillment Code:", 25, footerY + 2);
  doc.setFont("courier", "bold");
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(16);
  doc.text(apt.prescriptionCode || "PENDING", 120, footerY + 2);

  // 7. NEW: Contact Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150); // Light gray
  doc.text("To contact the campus pharmacy, please dial XXX-XXXX.", 105, 285, { align: "center" });

  // Download the file
  doc.save(`Prescription_${apt.prescriptionCode || apt.date}.pdf`);
};