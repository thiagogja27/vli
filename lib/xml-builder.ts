import type { NfeData, NfeItem, Participante } from "./nfe-parser"

function escapeXml(value?: string): string {
  if (value == null) return ""
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function tag(name: string, value?: string, indent = ""): string {
  if (value == null || value === "") return ""
  return `${indent}<${name}>${escapeXml(value)}</${name}>\n`
}

function buildParticipante(
  name: string,
  p: Participante,
  indent: string,
): string {
  const inner = indent + "  "
  let body = ""
  body += tag("nome", p.nome, inner)
  body += tag("documento", p.documento, inner)
  body += tag("inscricaoEstadual", p.inscricaoEstadual, inner)
  body += tag("endereco", p.endereco, inner)
  body += tag("municipio", p.municipio, inner)
  body += tag("uf", p.uf, inner)
  if (!body) return ""
  return `${indent}<${name}>\n${body}${indent}</${name}>\n`
}

function buildItem(item: NfeItem, index: number, indent: string): string {
  const inner = indent + "  "
  let body = ""
  body += tag("codigo", item.codigo, inner)
  body += tag("descricao", item.descricao, inner)
  body += tag("ncm", item.ncm, inner)
  body += tag("cfop", item.cfop, inner)
  body += tag("unidade", item.unidade, inner)
  body += tag("quantidade", item.quantidade, inner)
  body += tag("valorUnitario", item.valorUnitario, inner)
  body += tag("valorTotal", item.valorTotal, inner)
  return `${indent}<item numero="${index + 1}">\n${body}${indent}</item>\n`
}

/**
 * Gera um XML simples e legível com os campos extraídos da nota.
 */
export function buildXml(data: NfeData): string {
  const i1 = "  "
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += "<notaFiscal>\n"

  xml += `${i1}<identificacao>\n`
  xml += tag("chaveAcesso", data.chaveAcesso, i1 + "  ")
  xml += tag("numero", data.numero, i1 + "  ")
  xml += tag("serie", data.serie, i1 + "  ")
  xml += tag("modelo", data.modelo, i1 + "  ")
  xml += tag("dataEmissao", data.dataEmissao, i1 + "  ")
  xml += tag("naturezaOperacao", data.naturezaOperacao, i1 + "  ")
  xml += tag("protocolo", data.protocolo, i1 + "  ")
  xml += `${i1}</identificacao>\n`

  const emit = buildParticipante("emitente", data.emitente, i1)
  if (emit) xml += emit
  const dest = buildParticipante("destinatario", data.destinatario, i1)
  if (dest) xml += dest

  if (data.itens.length > 0) {
    xml += `${i1}<itens>\n`
    data.itens.forEach((item, idx) => {
      xml += buildItem(item, idx, i1 + "  ")
    })
    xml += `${i1}</itens>\n`
  }

  xml += `${i1}<totais>\n`
  xml += tag("valorProdutos", data.valorProdutos, i1 + "  ")
  xml += tag("valorIcms", data.valorIcms, i1 + "  ")
  xml += tag("valorFrete", data.valorFrete, i1 + "  ")
  xml += tag("valorTotal", data.valorTotal, i1 + "  ")
  xml += `${i1}</totais>\n`

  xml += "</notaFiscal>\n"
  return xml
}
