import { DOMParser } from "@xmldom/xmldom"

export interface NFEData {
  tipo: "NFe" | "NFSe" | "Desconhecido"
  // Identificação
  numero: string
  serie: string
  dataEmissao: string
  chaveAcesso: string
  naturezaOperacao: string
  // Emitente
  emitente: {
    cnpj: string
    nome: string
    nomeFantasia: string
    endereco: string
    cidade: string
    uf: string
    cep: string
    telefone: string
    inscricaoEstadual: string
  }
  // Destinatário
  destinatario: {
    cpfCnpj: string
    nome: string
    endereco: string
    cidade: string
    uf: string
    cep: string
    telefone: string
    email: string
  }
  // Produtos/Serviços
  itens: Array<{
    codigo: string
    descricao: string
    ncm: string
    cfop: string
    unidade: string
    quantidade: number
    valorUnitario: number
    valorTotal: number
  }>
  // Totais
  totais: {
    valorProdutos: number
    valorDesconto: number
    valorFrete: number
    valorSeguro: number
    valorOutros: number
    valorICMS: number
    valorIPI: number
    valorPIS: number
    valorCOFINS: number
    valorTotal: number
  }
  // Informações adicionais
  informacoesAdicionais: string
}

function getTextContent(doc: Document, tagName: string, parent?: Element): string {
  const context = parent || doc
  const elements = context.getElementsByTagName(tagName)
  if (elements.length > 0 && elements[0].textContent) {
    return elements[0].textContent.trim()
  }
  return ""
}

function parseNumber(value: string): number {
  const num = parseFloat(value.replace(",", "."))
  return isNaN(num) ? 0 : num
}

export function parseNFE(xmlString: string): NFEData {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, "text/xml")

  // Detectar tipo de documento
  const isNFe = doc.getElementsByTagName("NFe").length > 0 || doc.getElementsByTagName("nfeProc").length > 0
  const isNFSe =
    doc.getElementsByTagName("CompNfse").length > 0 || doc.getElementsByTagName("Nfse").length > 0

  const tipo = isNFe ? "NFe" : isNFSe ? "NFSe" : "Desconhecido"

  if (isNFe) {
    return parseNFeData(doc, tipo)
  } else if (isNFSe) {
    return parseNFSeData(doc, tipo)
  }

  return parseGenericData(doc, tipo)
}

function parseNFeData(doc: Document, tipo: "NFe" | "NFSe" | "Desconhecido"): NFEData {
  // Identificação
  const ide = doc.getElementsByTagName("ide")[0]
  const emit = doc.getElementsByTagName("emit")[0]
  const dest = doc.getElementsByTagName("dest")[0]
  const total = doc.getElementsByTagName("total")[0]
  const infAdic = doc.getElementsByTagName("infAdic")[0]
  const protNFe = doc.getElementsByTagName("protNFe")[0]

  // Parse itens
  const dets = doc.getElementsByTagName("det")
  const itens: NFEData["itens"] = []

  for (let i = 0; i < dets.length; i++) {
    const det = dets[i]
    const prod = det.getElementsByTagName("prod")[0]
    if (prod) {
      itens.push({
        codigo: getTextContent(doc, "cProd", prod),
        descricao: getTextContent(doc, "xProd", prod),
        ncm: getTextContent(doc, "NCM", prod),
        cfop: getTextContent(doc, "CFOP", prod),
        unidade: getTextContent(doc, "uCom", prod),
        quantidade: parseNumber(getTextContent(doc, "qCom", prod)),
        valorUnitario: parseNumber(getTextContent(doc, "vUnCom", prod)),
        valorTotal: parseNumber(getTextContent(doc, "vProd", prod)),
      })
    }
  }

  // Endereco emitente
  const enderEmit = emit?.getElementsByTagName("enderEmit")[0]
  const enderDest = dest?.getElementsByTagName("enderDest")[0]

  return {
    tipo,
    numero: getTextContent(doc, "nNF", ide),
    serie: getTextContent(doc, "serie", ide),
    dataEmissao: formatDate(getTextContent(doc, "dhEmi", ide) || getTextContent(doc, "dEmi", ide)),
    chaveAcesso: protNFe ? getTextContent(doc, "chNFe", protNFe as Element) : getTextContent(doc, "Id").replace("NFe", ""),
    naturezaOperacao: getTextContent(doc, "natOp", ide),
    emitente: {
      cnpj: formatCNPJ(getTextContent(doc, "CNPJ", emit)),
      nome: getTextContent(doc, "xNome", emit),
      nomeFantasia: getTextContent(doc, "xFant", emit),
      endereco: `${getTextContent(doc, "xLgr", enderEmit)}, ${getTextContent(doc, "nro", enderEmit)}`,
      cidade: getTextContent(doc, "xMun", enderEmit),
      uf: getTextContent(doc, "UF", enderEmit),
      cep: formatCEP(getTextContent(doc, "CEP", enderEmit)),
      telefone: formatPhone(getTextContent(doc, "fone", enderEmit)),
      inscricaoEstadual: getTextContent(doc, "IE", emit),
    },
    destinatario: {
      cpfCnpj: formatCPFCNPJ(
        getTextContent(doc, "CNPJ", dest) || getTextContent(doc, "CPF", dest)
      ),
      nome: getTextContent(doc, "xNome", dest),
      endereco: enderDest
        ? `${getTextContent(doc, "xLgr", enderDest)}, ${getTextContent(doc, "nro", enderDest)}`
        : "",
      cidade: getTextContent(doc, "xMun", enderDest),
      uf: getTextContent(doc, "UF", enderDest),
      cep: formatCEP(getTextContent(doc, "CEP", enderDest)),
      telefone: formatPhone(getTextContent(doc, "fone", enderDest)),
      email: getTextContent(doc, "email", dest),
    },
    itens,
    totais: {
      valorProdutos: parseNumber(getTextContent(doc, "vProd", total)),
      valorDesconto: parseNumber(getTextContent(doc, "vDesc", total)),
      valorFrete: parseNumber(getTextContent(doc, "vFrete", total)),
      valorSeguro: parseNumber(getTextContent(doc, "vSeg", total)),
      valorOutros: parseNumber(getTextContent(doc, "vOutro", total)),
      valorICMS: parseNumber(getTextContent(doc, "vICMS", total)),
      valorIPI: parseNumber(getTextContent(doc, "vIPI", total)),
      valorPIS: parseNumber(getTextContent(doc, "vPIS", total)),
      valorCOFINS: parseNumber(getTextContent(doc, "vCOFINS", total)),
      valorTotal: parseNumber(getTextContent(doc, "vNF", total)),
    },
    informacoesAdicionais: infAdic ? getTextContent(doc, "infCpl", infAdic as Element) : "",
  }
}

function parseNFSeData(doc: Document, tipo: "NFe" | "NFSe" | "Desconhecido"): NFEData {
  const infNfse = doc.getElementsByTagName("InfNfse")[0]
  const prestador = doc.getElementsByTagName("PrestadorServico")[0] || doc.getElementsByTagName("Prestador")[0]
  const tomador = doc.getElementsByTagName("TomadorServico")[0] || doc.getElementsByTagName("Tomador")[0]
  const servico = doc.getElementsByTagName("Servico")[0]
  const valores = doc.getElementsByTagName("Valores")[0]

  const enderecoPrestador = prestador?.getElementsByTagName("Endereco")[0]
  const enderecoTomador = tomador?.getElementsByTagName("Endereco")[0]
  const identificacaoTomador = tomador?.getElementsByTagName("IdentificacaoTomador")[0]

  return {
    tipo,
    numero: getTextContent(doc, "Numero", infNfse),
    serie: getTextContent(doc, "Serie", infNfse) || "1",
    dataEmissao: formatDate(getTextContent(doc, "DataEmissao", infNfse)),
    chaveAcesso: getTextContent(doc, "CodigoVerificacao", infNfse),
    naturezaOperacao: "Prestacao de Servicos",
    emitente: {
      cnpj: formatCNPJ(getTextContent(doc, "Cnpj", prestador)),
      nome: getTextContent(doc, "RazaoSocial", prestador),
      nomeFantasia: getTextContent(doc, "NomeFantasia", prestador),
      endereco: `${getTextContent(doc, "Endereco", enderecoPrestador)}, ${getTextContent(doc, "Numero", enderecoPrestador)}`,
      cidade: getTextContent(doc, "Municipio", enderecoPrestador) || getTextContent(doc, "CodigoMunicipio", enderecoPrestador),
      uf: getTextContent(doc, "Uf", enderecoPrestador),
      cep: formatCEP(getTextContent(doc, "Cep", enderecoPrestador)),
      telefone: formatPhone(getTextContent(doc, "Telefone", prestador)),
      inscricaoEstadual: getTextContent(doc, "InscricaoMunicipal", prestador),
    },
    destinatario: {
      cpfCnpj: formatCPFCNPJ(
        getTextContent(doc, "Cnpj", identificacaoTomador) || getTextContent(doc, "Cpf", identificacaoTomador)
      ),
      nome: getTextContent(doc, "RazaoSocial", tomador),
      endereco: enderecoTomador
        ? `${getTextContent(doc, "Endereco", enderecoTomador)}, ${getTextContent(doc, "Numero", enderecoTomador)}`
        : "",
      cidade: getTextContent(doc, "Municipio", enderecoTomador) || getTextContent(doc, "CodigoMunicipio", enderecoTomador),
      uf: getTextContent(doc, "Uf", enderecoTomador),
      cep: formatCEP(getTextContent(doc, "Cep", enderecoTomador)),
      telefone: formatPhone(getTextContent(doc, "Telefone", tomador)),
      email: getTextContent(doc, "Email", tomador),
    },
    itens: [
      {
        codigo: getTextContent(doc, "ItemListaServico", servico),
        descricao: getTextContent(doc, "Discriminacao", servico),
        ncm: "",
        cfop: "",
        unidade: "SV",
        quantidade: 1,
        valorUnitario: parseNumber(getTextContent(doc, "ValorServicos", valores)),
        valorTotal: parseNumber(getTextContent(doc, "ValorServicos", valores)),
      },
    ],
    totais: {
      valorProdutos: parseNumber(getTextContent(doc, "ValorServicos", valores)),
      valorDesconto: parseNumber(getTextContent(doc, "DescontoIncondicionado", valores)),
      valorFrete: 0,
      valorSeguro: 0,
      valorOutros: 0,
      valorICMS: 0,
      valorIPI: 0,
      valorPIS: parseNumber(getTextContent(doc, "ValorPis", valores)),
      valorCOFINS: parseNumber(getTextContent(doc, "ValorCofins", valores)),
      valorTotal: parseNumber(getTextContent(doc, "ValorLiquidoNfse", valores)) || parseNumber(getTextContent(doc, "ValorServicos", valores)),
    },
    informacoesAdicionais: getTextContent(doc, "Discriminacao", servico),
  }
}

function parseGenericData(doc: Document, tipo: "NFe" | "NFSe" | "Desconhecido"): NFEData {
  return {
    tipo,
    numero: "",
    serie: "",
    dataEmissao: new Date().toLocaleDateString("pt-BR"),
    chaveAcesso: "",
    naturezaOperacao: "",
    emitente: {
      cnpj: "",
      nome: "",
      nomeFantasia: "",
      endereco: "",
      cidade: "",
      uf: "",
      cep: "",
      telefone: "",
      inscricaoEstadual: "",
    },
    destinatario: {
      cpfCnpj: "",
      nome: "",
      endereco: "",
      cidade: "",
      uf: "",
      cep: "",
      telefone: "",
      email: "",
    },
    itens: [],
    totais: {
      valorProdutos: 0,
      valorDesconto: 0,
      valorFrete: 0,
      valorSeguro: 0,
      valorOutros: 0,
      valorICMS: 0,
      valorIPI: 0,
      valorPIS: 0,
      valorCOFINS: 0,
      valorTotal: 0,
    },
    informacoesAdicionais: "",
  }
}

// Formatters
function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-BR")
  } catch {
    return dateStr
  }
}

function formatCNPJ(cnpj: string): string {
  if (!cnpj) return ""
  const cleaned = cnpj.replace(/\D/g, "")
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
}

function formatCPFCNPJ(value: string): string {
  if (!value) return ""
  const cleaned = value.replace(/\D/g, "")
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }
  if (cleaned.length === 14) {
    return formatCNPJ(value)
  }
  return value
}

function formatCEP(cep: string): string {
  if (!cep) return ""
  const cleaned = cep.replace(/\D/g, "")
  if (cleaned.length !== 8) return cep
  return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2")
}

function formatPhone(phone: string): string {
  if (!phone) return ""
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  }
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }
  return phone
}
