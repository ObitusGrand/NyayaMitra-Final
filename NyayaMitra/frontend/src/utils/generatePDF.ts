// Professional PDF generator for NyayaMitra legal documents
import jsPDF from 'jspdf'

interface PDFOptions {
  title?: string
  docType?: string
  actsCited?: string[]
  disclaimer?: string
}

export const generatePDF = (text: string, filename: string, options?: PDFOptions) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginL = 20
  const marginR = 20
  const contentW = pageW - marginL - marginR
  let y = 20

  const addPage = () => {
    doc.addPage()
    y = 20
    // Page border
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.rect(10, 10, pageW - 20, pageH - 20)
  }

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 25) addPage()
  }

  // ── Page border
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(10, 10, pageW - 20, pageH - 20)

  // ── Header with gold accent line
  doc.setFillColor(245, 158, 11)
  doc.rect(marginL, y, contentW, 1, 'F')
  y += 6

  // ── NyayaMitra branding
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text('NYAYAMITRA', marginL, y)
  doc.setFontSize(8)
  doc.text('AI-Powered Legal Document', pageW - marginR, y, { align: 'right' })
  y += 4

  doc.setFontSize(7)
  doc.setTextColor(180, 180, 180)
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(`Generated: ${dateStr}`, marginL, y)
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Time: ${timeStr}`, pageW - marginR, y, { align: 'right' })
  y += 6

  // ── Document title
  if (options?.title || options?.docType) {
    const title = options.title || (options.docType || '').replace(/_/g, ' ').toUpperCase()
    doc.setFontSize(16)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    const titleLines = doc.splitTextToSize(title, contentW)
    doc.text(titleLines, marginL, y)
    y += titleLines.length * 8 + 2
  }

  // ── Separator
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(marginL, y, pageW - marginR, y)
  y += 8

  // ── Document body
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')

  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    if (!para.trim()) {
      y += 4
      continue
    }

    // Detect section headers (lines that are all caps or start with special markers)
    const isHeader = /^(TO|FROM|DATE|SUBJECT|RE:|NOTICE|DEAR|RESPECTED|SECTION|ARTICLE|WHEREAS|NOW THEREFORE)/i.test(para.trim())

    if (isHeader) {
      checkPage(12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(50, 50, 50)
    }

    const lines = doc.splitTextToSize(para.trim(), contentW)
    checkPage(lines.length * 5 + 2)
    doc.text(lines, marginL, y)
    y += lines.length * 5 + 2
  }

  // ── Acts cited section
  if (options?.actsCited && options.actsCited.length > 0) {
    y += 6
    checkPage(25)
    doc.setFillColor(245, 158, 11)
    doc.rect(marginL, y, contentW, 0.5, 'F')
    y += 5

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('ACTS & SECTIONS REFERENCED:', marginL, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    for (const act of options.actsCited) {
      checkPage(6)
      doc.text(`• ${act}`, marginL + 4, y)
      y += 4.5
    }
  }

  // ── Disclaimer
  y += 8
  checkPage(30)
  doc.setDrawColor(220, 220, 220)
  doc.line(marginL, y, pageW - marginR, y)
  y += 5

  doc.setFontSize(7)
  doc.setTextColor(140, 140, 140)
  doc.setFont('helvetica', 'italic')
  const discText = options?.disclaimer ||
    'DISCLAIMER: This document is AI-generated for informational purposes only. It does not constitute legal advice. For complex legal situations, consult a qualified advocate. NyayaMitra is a legal information tool, not a licensed legal advisor.'
  const discLines = doc.splitTextToSize(discText, contentW)
  checkPage(discLines.length * 3.5 + 4)
  doc.text(discLines, marginL, y)
  y += discLines.length * 3.5 + 4

  // ── Footer
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.setFont('helvetica', 'normal')
  doc.text('NyayaMitra — AI-Powered Legal Justice Platform', marginL, pageH - 14)
  doc.text('nyayamitra.vercel.app', pageW - marginR, pageH - 14, { align: 'right' })

  // ── Bottom accent line
  doc.setFillColor(245, 158, 11)
  doc.rect(marginL, pageH - 12, contentW, 0.5, 'F')

  doc.save(filename || 'nyayamitra_document.pdf')
}

// WhatsApp share utility
export const shareToWhatsApp = (text: string, docType?: string) => {
  const header = docType
    ? `*NyayaMitra — ${docType.replace(/_/g, ' ').toUpperCase()}*\n\n`
    : '*NyayaMitra Legal Document*\n\n'
  const truncated = text.length > 3000 ? text.substring(0, 3000) + '...\n\n[Document truncated — download full PDF from app]' : text
  const fullText = header + truncated + '\n\n_Generated by NyayaMitra — AI Legal Justice Platform_'
  const encoded = encodeURIComponent(fullText)
  window.open(`https://wa.me/?text=${encoded}`, '_blank')
}

// Share answer via WhatsApp
export const shareAnswerToWhatsApp = (question: string, answer: string, actsCited: string[]) => {
  const acts = actsCited.length > 0 ? `\n\n*Acts Cited:* ${actsCited.join(', ')}` : ''
  const text = `*NyayaMitra — Legal Advice*\n\n*Question:* ${question}\n\n*Answer:* ${answer}${acts}\n\n_Get free legal help at nyayamitra.vercel.app_`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}
