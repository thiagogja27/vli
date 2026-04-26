import jsPDF from "jspdf"
import type { NFEData } from "./nfe-parser"

const MARGIN = 5
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_COLOR = [0, 0, 0] as const
const HEADER_BG = [240, 240, 240] as const

function formatChaveAcesso(chave: string): string {
  if (!chave) return ""
  const cleaned = chave.replace(/\D/g, "")
  return cleaned.replace(/(\d{4})/g, "$1 ").trim()
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function drawBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...LINE_COLOR)
  doc.setLineWidth(0.3)
  doc.rect(x, y, w, h)
}

function drawBoxWithLabel(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, fontSize = 6) {
  drawBox(doc, x, y, w, h)
  doc.setFontSize(5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.text(label, x + 1, y + 3)
  doc.setFontSize(fontSize)
  doc.setFont("helvetica", "bold")
  doc.text(value || "", x + 1, y + h - 2)
}

export function generatePDF(data: NFEData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4")
  let y = MARGIN

  // ==================== CANHOTO ====================
  const canhotoHeight = 18
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, canhotoHeight)
  
  // Divisoes do canhoto
  const canhotoTextWidth = CONTENT_WIDTH - 60
  doc.setDrawColor(...LINE_COLOR)
  doc.line(MARGIN + canhotoTextWidth, y, MARGIN + canhotoTextWidth, y + canhotoHeight)
  doc.line(MARGIN + canhotoTextWidth + 30, y, MARGIN + canhotoTextWidth + 30, y + canhotoHeight)

  doc.setFontSize(6)
  doc.setFont("helvetica", "normal")
  doc.text(`RECEBEMOS DE ${data.emitente.nome || ""}`, MARGIN + 2, y + 4)
  doc.text("OS PRODUTOS CONSTANTES NA NOTA FISCAL INDICADA AO LADO.", MARGIN + 2, y + 7)
  
  doc.setFontSize(5)
  doc.text("DATA DE RECEBIMENTO", MARGIN + 2, y + 11)
  doc.text("IDENTIFICACAO E ASSINATURA DO RECEBEDOR", MARGIN + 35, y + 11)

  // NF-e box
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("NF-e", MARGIN + canhotoTextWidth + 10, y + 5)
  doc.setFontSize(6)
  doc.text(`No ${data.numero || ""}`, MARGIN + canhotoTextWidth + 5, y + 10)
  doc.text(`SERIE: ${data.serie || ""}`, MARGIN + canhotoTextWidth + 5, y + 14)

  y += canhotoHeight + 1

  // Linha pontilhada de corte
  doc.setLineDashPattern([1, 1], 0)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  doc.setLineDashPattern([], 0)
  y += 2

  // ==================== CABECALHO PRINCIPAL ====================
  const headerHeight = 38
  const danfeWidth = 35
  const emitWidth = CONTENT_WIDTH - danfeWidth - 55
  const nfWidth = 55
  
  // Box DANFE
  drawBox(doc, MARGIN, y, danfeWidth, headerHeight)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("DANFE", MARGIN + danfeWidth / 2, y + 8, { align: "center" })
  doc.setFontSize(6)
  doc.setFont("helvetica", "normal")
  doc.text("DOCUMENTO AUXILIAR", MARGIN + danfeWidth / 2, y + 12, { align: "center" })
  doc.text("DE NOTA FISCAL", MARGIN + danfeWidth / 2, y + 15, { align: "center" })
  doc.text("ELETRONICA", MARGIN + danfeWidth / 2, y + 18, { align: "center" })
  
  // Entrada/Saida
  doc.setFontSize(6)
  doc.text(data.tipoOperacao === "0" ? "0 - ENTRADA" : "1 - SAIDA", MARGIN + danfeWidth / 2, y + 24, { align: "center" })
  drawBox(doc, MARGIN + danfeWidth / 2 - 4, y + 26, 8, 5)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text(data.tipoOperacao || "1", MARGIN + danfeWidth / 2, y + 30, { align: "center" })

  doc.setFontSize(5)
  doc.setFont("helvetica", "normal")
  doc.text(`FOLHA ${data.folha}`, MARGIN + danfeWidth / 2, y + 36, { align: "center" })

  // Box Emitente
  drawBox(doc, MARGIN + danfeWidth, y, emitWidth, headerHeight)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text(data.emitente.nome || "", MARGIN + danfeWidth + emitWidth / 2, y + 7, { align: "center" })
  
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  const enderEmit = `${data.emitente.endereco || ""}, ${data.emitente.numero || ""} - ${data.emitente.bairro || ""}`
  doc.text(enderEmit.substring(0, 70), MARGIN + danfeWidth + emitWidth / 2, y + 13, { align: "center" })
  doc.text(`${data.emitente.cidade || ""} - ${data.emitente.uf || ""} CEP: ${data.emitente.cep || ""}`, MARGIN + danfeWidth + emitWidth / 2, y + 18, { align: "center" })
  doc.text(`FONE: ${data.emitente.telefone || ""}`, MARGIN + danfeWidth + emitWidth / 2, y + 23, { align: "center" })

  // Dados do emitente embaixo
  const emitDataY = y + 26
  const emitDataH = headerHeight - 26
  doc.line(MARGIN + danfeWidth, emitDataY, MARGIN + danfeWidth + emitWidth, emitDataY)
  
  // CNPJ, IE, IE ST
  const emitCol = emitWidth / 3
  doc.line(MARGIN + danfeWidth + emitCol, emitDataY, MARGIN + danfeWidth + emitCol, y + headerHeight)
  doc.line(MARGIN + danfeWidth + emitCol * 2, emitDataY, MARGIN + danfeWidth + emitCol * 2, y + headerHeight)
  
  doc.setFontSize(5)
  doc.text("CNPJ", MARGIN + danfeWidth + 1, emitDataY + 3)
  doc.text("INSCRICAO ESTADUAL", MARGIN + danfeWidth + emitCol + 1, emitDataY + 3)
  doc.text("INSCRICAO ESTADUAL DE SUBST.", MARGIN + danfeWidth + emitCol * 2 + 1, emitDataY + 3)
  
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.text(data.emitente.cnpj || "", MARGIN + danfeWidth + 1, emitDataY + 9)
  doc.text(data.emitente.inscricaoEstadual || "", MARGIN + danfeWidth + emitCol + 1, emitDataY + 9)
  doc.text(data.emitente.inscricaoEstadualST || "", MARGIN + danfeWidth + emitCol * 2 + 1, emitDataY + 9)

  // Box NF Info
  drawBox(doc, MARGIN + danfeWidth + emitWidth, y, nfWidth, headerHeight)
  
  doc.setFontSize(5)
  doc.setFont("helvetica", "normal")
  doc.text("CHAVE DE ACESSO", MARGIN + danfeWidth + emitWidth + 1, y + 3)
  doc.setFontSize(6)
  doc.setFont("helvetica", "bold")
  const chaveFormatada = formatChaveAcesso(data.chaveAcesso)
  doc.text(chaveFormatada.substring(0, 24) || "", MARGIN + danfeWidth + emitWidth + nfWidth / 2, y + 8, { align: "center" })
  doc.text(chaveFormatada.substring(24) || "", MARGIN + danfeWidth + emitWidth + nfWidth / 2, y + 12, { align: "center" })

  doc.line(MARGIN + danfeWidth + emitWidth, y + 14, MARGIN + danfeWidth + emitWidth + nfWidth, y + 14)
  doc.setFontSize(5)
  doc.setFont("helvetica", "normal")
  doc.text("Consulta de autenticidade no portal nacional da NF-e", MARGIN + danfeWidth + emitWidth + nfWidth / 2, y + 17, { align: "center" })
  doc.text("www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora.", MARGIN + danfeWidth + emitWidth + nfWidth / 2, y + 20, { align: "center" })

  doc.line(MARGIN + danfeWidth + emitWidth, y + 22, MARGIN + danfeWidth + emitWidth + nfWidth, y + 22)
  doc.setFontSize(5)
  doc.text("PROTOCOLO DE AUTORIZACAO DE USO", MARGIN + danfeWidth + emitWidth + 1, y + 25)
  doc.setFontSize(6)
  doc.setFont("helvetica", "bold")
  doc.text(data.protocolo || "", MARGIN + danfeWidth + emitWidth + nfWidth / 2, y + 30, { align: "center" })

  // Numero e Serie
  doc.line(MARGIN + danfeWidth + emitWidth, y + 32, MARGIN + danfeWidth + emitWidth + nfWidth, y + 32)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text(`No ${data.numero || ""}`, MARGIN + danfeWidth + emitWidth + nfWidth / 2, y + 36, { align: "center" })
  doc.setFontSize(6)
  doc.text(`SERIE: ${data.serie || ""}`, MARGIN + danfeWidth + emitWidth + nfWidth / 2, y + 38, { align: "center" })

  y += headerHeight + 1

  // ==================== NATUREZA DA OPERACAO ====================
  const natOpHeight = 8
  drawBox(doc, MARGIN, y, CONTENT_WIDTH * 0.65, natOpHeight)
  drawBox(doc, MARGIN + CONTENT_WIDTH * 0.65, y, CONTENT_WIDTH * 0.35, natOpHeight)
  
  doc.setFontSize(5)
  doc.setFont("helvetica", "normal")
  doc.text("NATUREZA DA OPERACAO", MARGIN + 1, y + 3)
  doc.text("CONTROLE DO FISCO", MARGIN + CONTENT_WIDTH * 0.65 + 1, y + 3)
  
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.text(data.naturezaOperacao || "", MARGIN + 1, y + 7)

  y += natOpHeight

  // ==================== DESTINATARIO / REMETENTE ====================
  const destTitleH = 4
  doc.setFillColor(...HEADER_BG)
  doc.rect(MARGIN, y, CONTENT_WIDTH, destTitleH, "F")
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, destTitleH)
  doc.setFontSize(6)
  doc.setFont("helvetica", "bold")
  doc.text("DESTINATARIO / REMETENTE", MARGIN + 1, y + 3)
  y += destTitleH

  // Linha 1: Nome, CNPJ, Data Emissao
  const destH1 = 8
  const destNameW = CONTENT_WIDTH * 0.55
  const destCnpjW = CONTENT_WIDTH * 0.25
  const destDateW = CONTENT_WIDTH * 0.20

  drawBoxWithLabel(doc, MARGIN, y, destNameW, destH1, "NOME / RAZAO SOCIAL", data.destinatario.nome || "", 7)
  drawBoxWithLabel(doc, MARGIN + destNameW, y, destCnpjW, destH1, "CNPJ / CPF", data.destinatario.cpfCnpj || "", 7)
  drawBoxWithLabel(doc, MARGIN + destNameW + destCnpjW, y, destDateW, destH1, "DATA E HORA DA EMISSAO", `${data.dataEmissao} ${data.horaEmissao}`, 6)
  y += destH1

  // Linha 2: Endereco, Bairro, CEP
  const destAddrW = CONTENT_WIDTH * 0.50
  const destBairroW = CONTENT_WIDTH * 0.25
  const destCepW = CONTENT_WIDTH * 0.25

  drawBoxWithLabel(doc, MARGIN, y, destAddrW, destH1, "ENDERECO", `${data.destinatario.endereco || ""}, ${data.destinatario.numero || ""}`, 6)
  drawBoxWithLabel(doc, MARGIN + destAddrW, y, destBairroW, destH1, "BAIRRO / DISTRITO", data.destinatario.bairro || "", 6)
  drawBoxWithLabel(doc, MARGIN + destAddrW + destBairroW, y, destCepW, destH1, "CEP", data.destinatario.cep || "", 7)
  y += destH1

  // Linha 3: Municipio, Fone, UF, IE, Data Saida, Hora Saida
  const destMunW = CONTENT_WIDTH * 0.35
  const destFoneW = CONTENT_WIDTH * 0.18
  const destUfW = CONTENT_WIDTH * 0.07
  const destIeW = CONTENT_WIDTH * 0.17
  const destDateSW = CONTENT_WIDTH * 0.13
  const destHoraSW = CONTENT_WIDTH * 0.10

  drawBoxWithLabel(doc, MARGIN, y, destMunW, destH1, "MUNICIPIO", data.destinatario.cidade || "", 7)
  drawBoxWithLabel(doc, MARGIN + destMunW, y, destFoneW, destH1, "FONE / FAX", data.destinatario.telefone || "", 6)
  drawBoxWithLabel(doc, MARGIN + destMunW + destFoneW, y, destUfW, destH1, "UF", data.destinatario.uf || "", 7)
  drawBoxWithLabel(doc, MARGIN + destMunW + destFoneW + destUfW, y, destIeW, destH1, "INSCRICAO ESTADUAL", data.destinatario.inscricaoEstadual || "", 6)
  drawBoxWithLabel(doc, MARGIN + destMunW + destFoneW + destUfW + destIeW, y, destDateSW, destH1, "DATA ENTRADA / SAIDA", data.dataEntradaSaida || "", 6)
  drawBoxWithLabel(doc, MARGIN + destMunW + destFoneW + destUfW + destIeW + destDateSW, y, destHoraSW, destH1, "HORA ENTRADA / SAIDA", data.horaEntradaSaida || "", 5)
  y += destH1

  // ==================== FATURA / DUPLICATA ====================
  if (data.fatura.numero || data.duplicatas.length > 0) {
    const fatTitleH = 4
    doc.setFillColor(...HEADER_BG)
    doc.rect(MARGIN, y, CONTENT_WIDTH, fatTitleH, "F")
    drawBox(doc, MARGIN, y, CONTENT_WIDTH, fatTitleH)
    doc.setFontSize(6)
    doc.setFont("helvetica", "bold")
    doc.text("FATURA / DUPLICATA", MARGIN + 1, y + 3)
    y += fatTitleH

    drawBox(doc, MARGIN, y, CONTENT_WIDTH, 6)
    doc.setFontSize(6)
    doc.setFont("helvetica", "normal")
    
    let faturaText = ""
    if (data.fatura.numero) {
      faturaText = `Fatura: ${data.fatura.numero} | Orig: ${formatCurrency(data.fatura.valorOriginal)} | Desc: ${formatCurrency(data.fatura.valorDesconto)} | Liq: ${formatCurrency(data.fatura.valorLiquido)}`
    }
    if (data.duplicatas.length > 0) {
      const dupTexts = data.duplicatas.map(d => `${d.numero}: ${formatCurrency(d.valor)} (${d.vencimento})`).join(" | ")
      faturaText += faturaText ? " - " + dupTexts : dupTexts
    }
    doc.text(faturaText.substring(0, 150), MARGIN + 1, y + 4)
    y += 6
  }

  // ==================== CALCULO DO IMPOSTO ====================
  const impTitleH = 4
  doc.setFillColor(...HEADER_BG)
  doc.rect(MARGIN, y, CONTENT_WIDTH, impTitleH, "F")
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, impTitleH)
  doc.setFontSize(6)
  doc.setFont("helvetica", "bold")
  doc.text("CALCULO DO IMPOSTO", MARGIN + 1, y + 3)
  y += impTitleH

  // Linha 1 impostos
  const impH = 8
  const impColW = CONTENT_WIDTH / 5

  drawBoxWithLabel(doc, MARGIN, y, impColW, impH, "BASE DE CALCULO DO ICMS", formatCurrency(data.impostos.baseCalcICMS), 6)
  drawBoxWithLabel(doc, MARGIN + impColW, y, impColW, impH, "VALOR DO ICMS", formatCurrency(data.impostos.valorICMS), 6)
  drawBoxWithLabel(doc, MARGIN + impColW * 2, y, impColW, impH, "BASE DE CALCULO DO ICMS SUBST.", formatCurrency(data.impostos.baseCalcICMSST), 6)
  drawBoxWithLabel(doc, MARGIN + impColW * 3, y, impColW, impH, "VALOR DO ICMS SUBST.", formatCurrency(data.impostos.valorICMSST), 6)
  drawBoxWithLabel(doc, MARGIN + impColW * 4, y, impColW, impH, "VALOR TOTAL DOS PRODUTOS", formatCurrency(data.impostos.valorProdutos), 6)
  y += impH

  // Linha 2 impostos
  const impCol2W = CONTENT_WIDTH / 6
  drawBoxWithLabel(doc, MARGIN, y, impCol2W, impH, "VALOR DO FRETE", formatCurrency(data.impostos.valorFrete), 6)
  drawBoxWithLabel(doc, MARGIN + impCol2W, y, impCol2W, impH, "VALOR DO SEGURO", formatCurrency(data.impostos.valorSeguro), 6)
  drawBoxWithLabel(doc, MARGIN + impCol2W * 2, y, impCol2W, impH, "DESCONTO", formatCurrency(data.impostos.desconto), 6)
  drawBoxWithLabel(doc, MARGIN + impCol2W * 3, y, impCol2W, impH, "OUTRAS DESPESAS ACESSORIAS", formatCurrency(data.impostos.outrasDesp), 6)
  drawBoxWithLabel(doc, MARGIN + impCol2W * 4, y, impCol2W, impH, "VALOR TOTAL DO IPI", formatCurrency(data.impostos.valorIPI), 6)
  drawBoxWithLabel(doc, MARGIN + impCol2W * 5, y, impCol2W, impH, "VALOR TOTAL DA NOTA", formatCurrency(data.impostos.valorTotal), 7)
  y += impH

  // ==================== TRANSPORTADOR / VOLUMES ====================
  const transpTitleH = 4
  doc.setFillColor(...HEADER_BG)
  doc.rect(MARGIN, y, CONTENT_WIDTH, transpTitleH, "F")
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, transpTitleH)
  doc.setFontSize(6)
  doc.setFont("helvetica", "bold")
  doc.text("TRANSPORTADOR / VOLUMES TRANSPORTADOS", MARGIN + 1, y + 3)
  y += transpTitleH

  // Linha 1 transportador
  const transpH = 8
  const transpNameW = CONTENT_WIDTH * 0.30
  const transpFreteW = CONTENT_WIDTH * 0.10
  const transpAnttW = CONTENT_WIDTH * 0.10
  const transpPlacaW = CONTENT_WIDTH * 0.12
  const transpUfW = CONTENT_WIDTH * 0.06
  const transpCnpjW = CONTENT_WIDTH * 0.17
  const transpIeW = CONTENT_WIDTH * 0.15

  const fretePorConta = data.transportador.fretePorConta === "0" ? "0-EMITENTE" : 
                        data.transportador.fretePorConta === "1" ? "1-DESTINATARIO" : 
                        data.transportador.fretePorConta === "2" ? "2-TERCEIROS" : 
                        data.transportador.fretePorConta === "9" ? "9-SEM FRETE" : 
                        data.transportador.fretePorConta || ""

  drawBoxWithLabel(doc, MARGIN, y, transpNameW, transpH, "NOME / RAZAO SOCIAL", data.transportador.nome || "", 5)
  drawBoxWithLabel(doc, MARGIN + transpNameW, y, transpFreteW, transpH, "FRETE POR CONTA", fretePorConta, 5)
  drawBoxWithLabel(doc, MARGIN + transpNameW + transpFreteW, y, transpAnttW, transpH, "CODIGO ANTT", data.transportador.codigoANTT || "", 5)
  drawBoxWithLabel(doc, MARGIN + transpNameW + transpFreteW + transpAnttW, y, transpPlacaW, transpH, "PLACA DO VEICULO", data.transportador.placaVeiculo || "", 6)
  drawBoxWithLabel(doc, MARGIN + transpNameW + transpFreteW + transpAnttW + transpPlacaW, y, transpUfW, transpH, "UF", data.transportador.ufVeiculo || "", 6)
  drawBoxWithLabel(doc, MARGIN + transpNameW + transpFreteW + transpAnttW + transpPlacaW + transpUfW, y, transpCnpjW, transpH, "CNPJ / CPF", data.transportador.cpfCnpj || "", 5)
  drawBoxWithLabel(doc, MARGIN + transpNameW + transpFreteW + transpAnttW + transpPlacaW + transpUfW + transpCnpjW, y, transpIeW, transpH, "INSCRICAO ESTADUAL", data.transportador.inscricaoEstadual || "", 5)
  y += transpH

  // Linha 2 transportador
  const transpEndW = CONTENT_WIDTH * 0.45
  const transpMunW = CONTENT_WIDTH * 0.35
  const transpUf2W = CONTENT_WIDTH * 0.20

  drawBoxWithLabel(doc, MARGIN, y, transpEndW, transpH, "ENDERECO", data.transportador.endereco || "", 5)
  drawBoxWithLabel(doc, MARGIN + transpEndW, y, transpMunW, transpH, "MUNICIPIO", data.transportador.cidade || "", 6)
  drawBoxWithLabel(doc, MARGIN + transpEndW + transpMunW, y, transpUf2W, transpH, "UF", data.transportador.uf || "", 6)
  y += transpH

  // Linha 3 volumes
  const volQtdW = CONTENT_WIDTH * 0.10
  const volEspW = CONTENT_WIDTH * 0.18
  const volMarcaW = CONTENT_WIDTH * 0.18
  const volNumW = CONTENT_WIDTH * 0.18
  const volPesoLW = CONTENT_WIDTH * 0.18
  const volPesoBW = CONTENT_WIDTH * 0.18

  drawBoxWithLabel(doc, MARGIN, y, volQtdW, transpH, "QUANTIDADE", data.transportador.quantidade > 0 ? formatNumber(data.transportador.quantidade, 0) : "", 6)
  drawBoxWithLabel(doc, MARGIN + volQtdW, y, volEspW, transpH, "ESPECIE", data.transportador.especie || "", 6)
  drawBoxWithLabel(doc, MARGIN + volQtdW + volEspW, y, volMarcaW, transpH, "MARCA", data.transportador.marca || "", 6)
  drawBoxWithLabel(doc, MARGIN + volQtdW + volEspW + volMarcaW, y, volNumW, transpH, "NUMERACAO", data.transportador.numeracao || "", 6)
  drawBoxWithLabel(doc, MARGIN + volQtdW + volEspW + volMarcaW + volNumW, y, volPesoLW, transpH, "PESO LIQUIDO", data.transportador.pesoLiquido > 0 ? formatNumber(data.transportador.pesoLiquido, 4) : "", 6)
  drawBoxWithLabel(doc, MARGIN + volQtdW + volEspW + volMarcaW + volNumW + volPesoLW, y, volPesoBW, transpH, "PESO BRUTO", data.transportador.pesoBruto > 0 ? formatNumber(data.transportador.pesoBruto, 4) : "", 6)
  y += transpH

  // ==================== DADOS DOS PRODUTOS / SERVICOS ====================
  const prodTitleH = 4
  doc.setFillColor(...HEADER_BG)
  doc.rect(MARGIN, y, CONTENT_WIDTH, prodTitleH, "F")
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, prodTitleH)
  doc.setFontSize(6)
  doc.setFont("helvetica", "bold")
  doc.text("DADOS DO PRODUTOS / SERVICOS", MARGIN + 1, y + 3)
  y += prodTitleH

  // Cabecalho da tabela de produtos
  const prodHeaderH = 8
  const colCod = 20
  const colDesc = 50
  const colNcm = 18
  const colCst = 10
  const colCfop = 12
  const colUnid = 10
  const colQtd = 18
  const colVUnit = 18
  const colVTot = 18
  const colBaseIcms = 16
  const colVIcms = 0 // Ajuste para caber
  const colPIcms = 0
  const colPIpi = 0
  const colVIpi = CONTENT_WIDTH - colCod - colDesc - colNcm - colCst - colCfop - colUnid - colQtd - colVUnit - colVTot - colBaseIcms

  drawBox(doc, MARGIN, y, CONTENT_WIDTH, prodHeaderH)
  
  let xPos = MARGIN
  doc.setFontSize(4.5)
  doc.setFont("helvetica", "bold")
  
  // Headers
  const headers = [
    { w: colCod, t: "CODIGO" },
    { w: colDesc, t: "DESCRICAO DOS PRODUTOS / SERVICOS" },
    { w: colNcm, t: "NCM/SH" },
    { w: colCst, t: "CST" },
    { w: colCfop, t: "CFOP" },
    { w: colUnid, t: "UNID" },
    { w: colQtd, t: "QUANT." },
    { w: colVUnit, t: "VALOR UNIT" },
    { w: colVTot, t: "VALOR TOTAL" },
    { w: colBaseIcms, t: "BASE ICMS" },
    { w: colVIpi, t: "VALOR IPI" },
  ]

  headers.forEach(h => {
    doc.line(xPos, y, xPos, y + prodHeaderH)
    doc.text(h.t, xPos + 1, y + 3)
    
    // Segunda linha do header
    const secondLine: Record<string, string> = {
      "QUANT.": "",
      "VALOR UNIT": "",
      "VALOR TOTAL": "",
      "BASE ICMS": "CALCULO",
      "VALOR IPI": "",
    }
    if (secondLine[h.t] !== undefined) {
      doc.text(secondLine[h.t], xPos + 1, y + 6)
    }
    
    xPos += h.w
  })

  y += prodHeaderH

  // Itens
  const itemH = 5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(5)

  for (const item of data.itens) {
    // Verificar se precisa de nova página
    if (y > 270) {
      doc.addPage()
      y = MARGIN
    }

    drawBox(doc, MARGIN, y, CONTENT_WIDTH, itemH)
    xPos = MARGIN

    const values = [
      { w: colCod, v: item.codigo },
      { w: colDesc, v: item.descricao.substring(0, 45) },
      { w: colNcm, v: item.ncm },
      { w: colCst, v: item.cst },
      { w: colCfop, v: item.cfop },
      { w: colUnid, v: item.unidade },
      { w: colQtd, v: formatNumber(item.quantidade, 4) },
      { w: colVUnit, v: formatNumber(item.valorUnitario, 4) },
      { w: colVTot, v: formatNumber(item.valorTotal, 2) },
      { w: colBaseIcms, v: formatNumber(item.baseICMS, 2) },
      { w: colVIpi, v: formatNumber(item.valorIPI, 2) },
    ]

    values.forEach(v => {
      doc.line(xPos, y, xPos, y + itemH)
      doc.text(v.v || "", xPos + 1, y + 3.5)
      xPos += v.w
    })

    y += itemH
  }

  // ==================== DADOS ADICIONAIS ====================
  // Verificar se precisa de nova pagina
  if (y > 250) {
    doc.addPage()
    y = MARGIN
  }

  const dadosAdH = 4
  doc.setFillColor(...HEADER_BG)
  doc.rect(MARGIN, y, CONTENT_WIDTH, dadosAdH, "F")
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, dadosAdH)
  doc.setFontSize(6)
  doc.setFont("helvetica", "bold")
  doc.text("DADOS ADICIONAIS", MARGIN + 1, y + 3)
  y += dadosAdH

  const infoH = 25
  const infoCompW = CONTENT_WIDTH * 0.65
  const infoFiscoW = CONTENT_WIDTH * 0.35

  drawBox(doc, MARGIN, y, infoCompW, infoH)
  drawBox(doc, MARGIN + infoCompW, y, infoFiscoW, infoH)

  doc.setFontSize(5)
  doc.setFont("helvetica", "bold")
  doc.text("INFORMACOES COMPLEMENTARES", MARGIN + 1, y + 3)
  doc.text("RESERVADO AO FISCO", MARGIN + infoCompW + 1, y + 3)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(5)
  
  // Quebrar texto em linhas
  const infoComp = data.informacoesComplementares || ""
  const linesComp = doc.splitTextToSize(infoComp, infoCompW - 4)
  doc.text(linesComp.slice(0, 8), MARGIN + 1, y + 7)

  const infoFisco = data.informacoesFisco || ""
  const linesFisco = doc.splitTextToSize(infoFisco, infoFiscoW - 4)
  doc.text(linesFisco.slice(0, 8), MARGIN + infoCompW + 1, y + 7)

  return doc
}
