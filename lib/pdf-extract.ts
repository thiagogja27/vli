"use client"

import * as pdfjsLib from "pdfjs-dist"

// Configura o worker do pdf.js usando o bundle local (compatível com Turbopack/Webpack)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

export type ExtractedPage = {
  page: number
  text: string
}

/**
 * Extrai o texto de todas as páginas de um PDF.
 * Retorna o texto completo concatenado e o texto por página.
 */
export async function extractPdfText(file: File): Promise<{
  fullText: string
  pages: ExtractedPage[]
}> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const pages: ExtractedPage[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Reconstrói as linhas usando a posição vertical dos itens
    const items = content.items as Array<{
      str: string
      transform: number[]
    }>

    const lines = new Map<number, string[]>()
    for (const item of items) {
      if (!item.str) continue
      // Arredonda o Y para agrupar itens na mesma linha
      const y = Math.round(item.transform[5])
      const existing = lines.get(y) ?? []
      existing.push(item.str)
      lines.set(y, existing)
    }

    const orderedY = Array.from(lines.keys()).sort((a, b) => b - a)
    const text = orderedY.map((y) => lines.get(y)!.join(" ")).join("\n")

    pages.push({ page: i, text })
  }

  const fullText = pages.map((p) => p.text).join("\n")
  return { fullText, pages }
}
