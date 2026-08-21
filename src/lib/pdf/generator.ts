import { jsPDF } from 'jspdf';
import { SyntheticDocumentData } from '@/lib/constants/demo-scenarios';

/**
 * Server-Side Synthetic PDF Document Generator
 * Generates clean, machine-readable PDF documents using jsPDF.
 * Output includes explicit key-value field labels, headers, seals, and watermark.
 */

export function generateSyntheticPDF(docData: SyntheticDocumentData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Background Watermark
  doc.setTextColor(230, 230, 230);
  doc.setFontSize(28);
  doc.text('SYNTHETIC DATA - DEMO ONLY', 20, 140, { angle: 35 });
  doc.text('FOR HACKATHON EVALUATION', 25, 170, { angle: 35 });

  // Outer Border
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, 190, 277);

  // Inner Decorative Border
  doc.setLineWidth(0.2);
  doc.rect(12, 12, 186, 273);

  // Government Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(docData.title, 105, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Official Record & Verification Document`, 105, 31, { align: 'center' });

  // Divider Line
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.4);
  doc.line(20, 36, 190, 36);

  // Metadata Bar
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document No: ${docData.documentNumber}`, 20, 43);
  doc.text(`Issue Date: ${docData.issueDate}`, 140, 43);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 77, 219); // Institutional Blue
  doc.text('OFFICIAL RECORD & EXTRACTED PARTICULARS', 20, 55);

  doc.setDrawColor(226, 232, 240);
  doc.line(20, 58, 190, 58);

  // Key-Value Fields Rendering (Structured for OCR)
  let startY = 68;
  doc.setFontSize(10);

  Object.entries(docData.fields).forEach(([label, value]) => {
    // Label Box / Background
    doc.setFillColor(248, 250, 252);
    doc.rect(20, startY - 4, 60, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, startY - 4, 170, 8, 'D');

    // Label Text
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`${label}:`, 23, startY);

    // Value Text
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), 83, startY);

    startY += 12;
  });

  // Declarative Verification Section
  startY += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Note: This document is digitally registered under the State Document Verification System.',
    20,
    startY
  );
  doc.text(
    'All particulars herein are subject to cross-document comparison and automated rule verification.',
    20,
    startY + 5
  );

  // Signature & Stamp Placeholder
  startY += 30;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Issuing Authority:', 130, startY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(docData.issuingAuthority, 130, startY + 5);

  doc.setDrawColor(148, 163, 184);
  doc.line(130, startY + 12, 185, startY + 12);
  doc.text('[Digitally Signed & Certified]', 130, startY + 16);

  // Output as Buffer for Node.js
  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}
