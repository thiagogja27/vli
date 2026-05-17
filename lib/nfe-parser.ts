'use client'

import { XMLParser } from 'fast-xml-parser'

// Tipagem dos dados extraídos
export interface NFEData {
  tipo: 'NFe' | 'NFCe' | 'Desconhecido'
  chaveAcesso: string
  numero: string
  serie: string
  dataEmissao: string
  emitente: {
    nome: string
    nomeFantasia: string
    cnpj: string
    endereco: string
    cidade: string
    uf: string
  }
  destinatario: {
    nome: string
    cpfCnpj: string
    endereco: string
    cidade: string
    uf: string
    email: string
  }
  itens: {
    codigo: string
    descricao: string
    ncm: string
    cfop: string
    quantidade: number
    unidade: string
    valorUnitario: number
    valorTotal: number
  }[]
  impostos: {
    valorProdutos: number
    valorFrete: number
    desconto: number
    outrasDesp: number
    valorICMS: number
    valorIPI: number
    valorTotal: number
  }
  terminalEntrega: string
  transbordo: string
  retirada: string
  tipoProduto: string
}

// Função para garantir que um valor seja sempre um array
const ensureArray = (value: any) => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

// Função para obter um valor de um objeto, com um valor padrão
const getValue = (obj: any, path: string, defaultValue: any = '') => {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current === null || current === undefined) return defaultValue
    current = current[key]
  }
  return current ?? defaultValue
}

export function parseNFE(xmlString: string): NFEData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseNodeValue: false,      // GARANTE que o valor do nó seja string
    parseAttributeValue: false, // GARANTE que o valor do atributo seja string
    isArray: (name, jpath) => {
        return jpath === "NFe.infNFe.det"
    }
  });

  const doc = parser.parse(xmlString)

  const infNFe = getValue(doc, 'NFe.infNFe')
  const ide = getValue(infNFe, 'ide')
  const emit = getValue(infNFe, 'emit')
  const dest = getValue(infNFe, 'dest')
  const detArray = ensureArray(getValue(infNFe, 'det'))
  const total = getValue(infNFe, 'total.ICMSTot')
  const transp = getValue(infNFe, 'transp')
  const enderEmit = getValue(emit, 'enderEmit')
  const enderDest = getValue(dest, 'enderDest')

  // 🔥 CORREÇÃO DEFINITIVA: Força a Chave de Acesso para String no momento da extração.
  const chaveAcesso = String(getValue(infNFe, '@_Id', '')).replace(/^NFe/, '')

  // Extração de informações de terminais e produtos
  const infAdic = getValue(infNFe, 'infAdic.infCpl', '')
  let terminalEntrega = ''
  let transbordo = ''
  let retirada = ''
  let tipoProduto = 'OUTRO'

  if (infAdic) {
    const tegMatch = infAdic.match(/TERMINAL DE ENTREGA: (TEG)/i)
    const teagMatch = infAdic.match(/TERMINAL DE ENTREGA: (TEAG)/i)
    if (tegMatch) terminalEntrega = tegMatch[1]
    if (teagMatch) terminalEntrega = teagMatch[1]

    const transbordoMatch = infAdic.match(/TRANSBORDO EM: ([^;]+)/i)
    if (transbordoMatch) transbordo = transbordoMatch[1].trim()
    
    const retiradaMatch = infAdic.match(/RETIRADA EM: ([^;]+)/i)
    if (retiradaMatch) retirada = retiradaMatch[1].trim()
  }

  const produtoPrincipal = detArray.length > 0 ? getValue(detArray[0], 'prod.xProd', '').toUpperCase() : ''
  if (produtoPrincipal.includes('SOJA')) {
    tipoProduto = 'SOJA'
  } else if (produtoPrincipal.includes('FARELO')) {
    tipoProduto = 'FARELO'
  } else if (produtoPrincipal.includes('MILHO')) {
    tipoProduto = 'MILHO'
  }

  const data: NFEData = {
    tipo: 'NFe',
    chaveAcesso,
    numero: String(getValue(ide, 'nNF', '')),
    serie: String(getValue(ide, 'serie', '')),
    dataEmissao: new Date(getValue(ide, 'dhEmi')).toLocaleDateString('pt-BR'),
    emitente: {
      nome: getValue(emit, 'xNome', ''),
      nomeFantasia: getValue(emit, 'xFant', ''),
      cnpj: String(getValue(emit, 'CNPJ', '')),
      endereco: `${getValue(enderEmit, 'xLgr', '')}, ${getValue(enderEmit, 'nro', '')}`,
      cidade: getValue(enderEmit, 'xMun', ''),
      uf: getValue(enderEmit, 'UF', ''),
    },
    destinatario: {
      nome: getValue(dest, 'xNome', ''),
      cpfCnpj: String(getValue(dest, 'CNPJ', getValue(dest, 'CPF', ''))),
      endereco: `${getValue(enderDest, 'xLgr', '')}, ${getValue(enderDest, 'nro', '')}`,
      cidade: getValue(enderDest, 'xMun', ''),
      uf: getValue(enderDest, 'UF', ''),
      email: getValue(dest, 'email', ''),
    },
    itens: detArray.map((item: any) => ({
      codigo: String(getValue(item, 'prod.cProd', '')),
      descricao: getValue(item, 'prod.xProd', ''),
      ncm: String(getValue(item, 'prod.NCM', '')),
      cfop: String(getValue(item, 'prod.CFOP', '')),
      quantidade: parseFloat(getValue(item, 'prod.qCom', 0)),
      unidade: getValue(item, 'prod.uCom', ''),
      valorUnitario: parseFloat(getValue(item, 'prod.vUnCom', 0)),
      valorTotal: parseFloat(getValue(item, 'prod.vProd', 0)),
    })),
    impostos: {
      valorProdutos: parseFloat(getValue(total, 'vProd', 0)),
      valorFrete: parseFloat(getValue(total, 'vFrete', 0)),
      desconto: parseFloat(getValue(total, 'vDesc', 0)),
      outrasDesp: parseFloat(getValue(total, 'vOutro', 0)),
      valorICMS: parseFloat(getValue(total, 'vICMS', 0)),
      valorIPI: parseFloat(getValue(total, 'vIPI', 0)),
      valorTotal: parseFloat(getValue(total, 'vNF', 0)),
    },
    terminalEntrega,
    transbordo,
    retirada,
    tipoProduto
  }

  return data
}
