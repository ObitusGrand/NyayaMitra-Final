// PDF generator utility using jsPDF
import jsPDF from 'jspdf'
export const generatePDF = (text: string, filename: string) => {
  const doc = new jsPDF()
  const lines = doc.splitTextToSize(text, 180)
  doc.text(lines, 15, 15)
  doc.save(filename || 'nyayamitra_document.pdf')
}
