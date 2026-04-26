import jsPDF from "jspdf"
import type { NFEData } from "./nfe-parser"

export function generatePDF(data: NFEData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Header
  doc.setFillColor(30, 41, 59) // slate-800
  doc.rect(0, 0, pageWidth, 35, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  const tipoDoc = data.tipo === "NFe" ? "NOTA FISCAL ELETRONICA" : data.tipo === "NFSe" ? "NOTA FISCAL DE SERVICOS" : "DOCUMENTO FISCAL"
  doc.text(tipoDoc, pageWidth / 2, 15, { align: "center" })

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(`Numero: ${data.numero || "N/A"} | Serie: ${data.serie || "N/A"}`, pageWidth / 2, 25, { align: "center" })

  y = 45

  // Chave de acesso
  if (data.chaveAcesso) {
    doc.setTextColor(100, 116, 139) // slate-500
    doc.setFontSize(8)
    doc.text(`Chave de Acesso: ${data.chaveAcesso}`, pageWidth / 2, y, { align: "center" })
    y += 10
  }

  // Emitente section
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("EMITENTE", margin, y)
  y += 2
  doc.setDrawColor(30, 41, 59)
  doc.line(margin, y, margin + contentWidth, y)
  y += 6

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(51, 65, 85) // slate-700

  if (data.emitente.nome) {
    doc.setFont("helvetica", "bold")
    doc.text(data.emitente.nome, margin, y)
    y += 5
  }
  if (data.emitente.nomeFantasia) {
    doc.setFont("helvetica", "normal")
    doc.text(`Nome Fantasia: ${data.emitente.nomeFantasia}`, margin, y)
    y += 5
  }
  if (data.emitente.cnpj) {
    doc.text(`CNPJ: ${data.emitente.cnpj}`, margin, y)
    if (data.emitente.inscricaoEstadual) {
      doc.text(`IE: ${data.emitente.inscricaoEstadual}`, margin + 80, y)
    }
    y += 5
  }
  if (data.emitente.endereco) {
    doc.text(`${data.emitente.endereco}`, margin, y)
    y += 5
  }
  if (data.emitente.cidade || data.emitente.uf) {
    doc.text(`${data.emitente.cidade} - ${data.emitente.uf} ${data.emitente.cep ? `CEP: ${data.emitente.cep}` : ""}`, margin, y)
    y += 5
  }
  if (data.emitente.telefone) {
    doc.text(`Tel: ${data.emitente.telefone}`, margin, y)
    y += 5
  }

  y += 5

  // Destinatário section
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("DESTINATARIO", margin, y)
  y += 2
  doc.line(margin, y, margin + contentWidth, y)
  y += 6

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(51, 65, 85)

  if (data.destinatario.nome) {
    doc.setFont("helvetica", "bold")
    doc.text(data.destinatario.nome, margin, y)
    y += 5
  }
  if (data.destinatario.cpfCnpj) {
    doc.setFont("helvetica", "normal")
    doc.text(`CPF/CNPJ: ${data.destinatario.cpfCnpj}`, margin, y)
    y += 5
  }
  if (data.destinatario.endereco) {
    doc.text(`${data.destinatario.endereco}`, margin, y)
    y += 5
  }
  if (data.destinatario.cidade || data.destinatario.uf) {
    doc.text(`${data.destinatario.cidade} - ${data.destinatario.uf} ${data.destinatario.cep ? `CEP: ${data.destinatario.cep}` : ""}`, margin, y)
    y += 5
  }
  if (data.destinatario.email) {
    doc.text(`Email: ${data.destinatario.email}`, margin, y)
    y += 5
  }

  y += 5

  // Items table
  if (data.itens.length > 0) {
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("PRODUTOS / SERVICOS", margin, y)
    y += 2
    doc.line(margin, y, margin + contentWidth, y)
    y += 6

    // Table header
    doc.setFillColor(241, 245, 249) // slate-100
    doc.rect(margin, y - 4, contentWidth, 8, "F")

    doc.setFontSize(8)
    doc.setTextColor(30, 41, 59)
    const colWidths = [60, 20, 25, 25, 25, 25]
    const cols = ["Descricao", "Un", "Qtd", "V. Unit", "V. Total", "CFOP"]

    let xPos = margin + 2
    cols.forEach((col, i) => {
      doc.text(col, xPos, y)
      xPos += colWidths[i]
    })
    y += 6

    doc.setFont("helvetica", "normal")
    doc.setTextColor(51, 65, 85)
    doc.setFontSize(8)

    data.itens.forEach((item, index) => {
      // Check if we need a new page
      if (y > 260) {
        doc.addPage()
        y = margin
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252) // slate-50
        doc.rect(margin, y - 4, contentWidth, 6, "F")
      }

      xPos = margin + 2
      // Truncate description if too long
      const desc = item.descricao.length > 35 ? item.descricao.substring(0, 32) + "..." : item.descricao
      doc.text(desc, xPos, y)
      xPos += colWidths[0]
      doc.text(item.unidade, xPos, y)
      xPos += colWidths[1]
      doc.text(item.quantidade.toFixed(2), xPos, y)
      xPos += colWidths[2]
      doc.text(formatCurrency(item.valorUnitario), xPos, y)
      xPos += colWidths[3]
      doc.text(formatCurrency(item.valorTotal), xPos, y)
      xPos += colWidths[4]
      doc.text(item.cfop || "-", xPos, y)
      y += 6
    })

    y += 5
  }

  // Check if we need a new page for totals
  if (y > 230) {
    doc.addPage()
    y = margin
  }

  // Totals section
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("TOTAIS", margin, y)
  y += 2
  doc.line(margin, y, margin + contentWidth, y)
  y += 8

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(51, 65, 85)

  const totalsCol1 = [
    { label: "Valor dos Produtos/Servicos:", value: data.totais.valorProdutos },
    { label: "Desconto:", value: data.totais.valorDesconto },
    { label: "Frete:", value: data.totais.valorFrete },
  ]

  const totalsCol2 = [
    { label: "ICMS:", value: data.totais.valorICMS },
    { label: "PIS:", value: data.totais.valorPIS },
    { label: "COFINS:", value: data.totais.valorCOFINS },
  ]

  totalsCol1.forEach((item) => {
    doc.text(item.label, margin, y)
    doc.text(formatCurrency(item.value), margin + 55, y)
    y += 5
  })

  y -= 15
  totalsCol2.forEach((item) => {
    doc.text(item.label, margin + 90, y)
    doc.text(formatCurrency(item.value), margin + 130, y)
    y += 5
  })

  y += 5

  // Total highlight
  doc.setFillColor(30, 41, 59)
  doc.rect(margin, y - 3, contentWidth, 12, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("VALOR TOTAL DA NOTA:", margin + 5, y + 5)
  doc.text(formatCurrency(data.totais.valorTotal), pageWidth - margin - 5, y + 5, { align: "right" })

  y += 18

  // Info adicional
  if (data.informacoesAdicionais) {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage()
      y = margin
    }

    doc.setTextColor(30, 41, 59)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("INFORMACOES ADICIONAIS", margin, y)
    y += 2
    doc.line(margin, y, margin + contentWidth, y)
    y += 6

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)

    // Split text into lines
    const lines = doc.splitTextToSize(data.informacoesAdicionais, contentWidth)
    doc.text(lines, margin, y)
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setTextColor(148, 163, 184) // slate-400
  doc.setFontSize(8)
  doc.text(
    `Documento gerado em ${new Date().toLocaleString("pt-BR")}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  )

  return doc
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}
