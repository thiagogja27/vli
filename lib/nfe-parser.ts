import { XMLParser } from 'fast-xml-parser';

export interface NFEData {
  tipo: "NFe" | "NFSe" | "Desconhecido"
  // Identificação
  numero: string
  serie: string
  dataEmissao: string
  horaEmissao: string
  dataEntradaSaida: string
  horaEntradaSaida: string
  chaveAcesso: string
  protocolo: string
  naturezaOperacao: string
  tipoOperacao: "0" | "1" // 0 = entrada, 1 = saída
  folha: string
  // Campos extraídos das informações complementares
  terminalEntrega: string
  transbordo: string
  retirada: string
  tipoProduto: "SOJA" | "MILHO" | "ACUCAR" | "OUTRO"
  // Emitente
  emitente: {
    cnpj: string
    nome: string
    nomeFantasia: string
    endereco: string
    numero: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    telefone: string
    inscricaoEstadual: string
    inscricaoEstadualST: string
  }
  // Destinatário
  destinatario: {
    cpfCnpj: string
    nome: string
    endereco: string
    numero: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    telefone: string
    email: string
    inscricaoEstadual: string
  }
  // Transportador
  transportador: {
    nome: string
    cpfCnpj: string
    endereco: string
    cidade: string
    uf: string
    inscricaoEstadual: string
    fretePorConta: string // 0=emitente, 1=destinatario, etc
    codigoANTT: string
    placaVeiculo: string
    ufVeiculo: string
    // Volumes
    quantidade: number
    especie: string
    marca: string
    numeracao: string
    pesoLiquido: number
    pesoBruto: number
  }
  // Produtos/Serviços
  itens: Array<{
    numero: string
    codigo: string
    descricao: string
    ncm: string
    cst: string
    cfop: string
    unidade: string
    quantidade: number
    valorUnitario: number
    valorTotal: number
    baseICMS: number
    valorICMS: number
    aliqICMS: number
    aliqIPI: number
    valorIPI: number
  }>
  // Cálculo do imposto
  impostos: {
    baseCalcICMS: number
    valorICMS: number
    baseCalcICMSST: number
    valorICMSST: number
    valorFrete: number
    valorSeguro: number
    desconto: number
    outrasDesp: number
    valorIPI: number
    valorProdutos: number
    valorTotal: number
  }
  // Fatura / Duplicatas
  fatura: {
    numero: string
    valorOriginal: number
    valorDesconto: number
    valorLiquido: number
  }
  duplicatas: Array<{
    numero: string
    vencimento: string
    valor: number
  }>
  // Informações adicionais
  informacoesComplementares: string
  informacoesFisco: string
}

// Helpers
function getString(value: any): string {
    if (value === undefined || value === null) {
        return "";
    }
    return String(value).trim();
}

function parseNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(",", "."))
    return isNaN(num) ? 0 : num
  }
  return 0;
}

export function parseNFE(xmlString: string): NFEData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseNodeValue: false, // Prevent automatic type conversion
    parseAttributeValue: false, // Prevent automatic type conversion
    isArray: (name, jpath, isLeafNode, isAttribute) => { 
        return jpath === "NFe.infNFe.det" || jpath === "nfeProc.NFe.infNFe.det" || jpath === "infNFe.det" || jpath === "NFe.infNFe.cobr.dup" || jpath === "nfeProc.NFe.infNFe.cobr.dup" || jpath === "infNFe.cobr.dup";
    }
  });
  const doc = parser.parse(xmlString);

  // NFe
  if (doc.nfeProc || doc.NFe) {
    const nfeContainer = doc.nfeProc || doc;
    return parseNFeData(nfeContainer, "NFe");
  }

  // NFSe
  if (doc.CompNfse || doc.Nfse) {
      const nfseContainer = doc.CompNfse || doc.Nfse;
      return parseNFSeData(nfseContainer, "NFSe");
  }
  if (doc.consultarLoteRpsResposta?.listaNfse?.compNfse) {
      return parseNFSeData(doc.consultarLoteRpsResposta.listaNfse.compNfse, "NFSe");
  }

  return parseGenericData("Desconhecido");
}

function parseNFeData(nfeContainer: any, tipo: "NFe"): NFEData {
  const nfe = nfeContainer.NFe;
  if (!nfe) throw new Error("Estrutura de NFe inválida: tag <NFe> não encontrada.");

  const infNFe = nfe.infNFe;
  const protNFe = nfeContainer.protNFe?.infProt;

  const ide = infNFe.ide;
  const emit = infNFe.emit;
  const dest = infNFe.dest;
  const total = infNFe.total.ICMSTot;
  const transp = infNFe.transp;
  const cobr = infNFe.cobr;
  const infAdic = infNFe.infAdic;

  const itens: NFEData["itens"] = (infNFe.det || []).map((det: any, i: number) => {
    const prod = det.prod;
    const imposto = det.imposto;
    const icms = imposto?.ICMS;
    const ipi = imposto?.IPI;
    
    let icmsElement: any;
    if (icms) {
      const icmsTypes = ["ICMS00", "ICMS10", "ICMS20", "ICMS30", "ICMS40", "ICMS41", "ICMS50", "ICMS51", "ICMS60", "ICMS70", "ICMS90", "ICMSSN101", "ICMSSN102", "ICMSSN201", "ICMSSN202", "ICMSSN500", "ICMSSN900"];
      for (const icmsType of icmsTypes) {
        if (icms[icmsType]) {
          icmsElement = icms[icmsType];
          break;
        }
      }
    }

    const ipiElement = ipi?.IPITrib;

    return {
        numero: getString(det['@_nItem']) || String(i + 1),
        codigo: getString(prod.cProd),
        descricao: getString(prod.xProd),
        ncm: getString(prod.NCM),
        cst: icmsElement ? (getString(icmsElement.CST) || getString(icmsElement.CSOSN)) : "",
        cfop: getString(prod.CFOP),
        unidade: getString(prod.uCom),
        quantidade: parseNumber(prod.qCom),
        valorUnitario: parseNumber(prod.vUnCom),
        valorTotal: parseNumber(prod.vProd),
        baseICMS: icmsElement ? parseNumber(icmsElement.vBC) : 0,
        valorICMS: icmsElement ? parseNumber(icmsElement.vICMS) : 0,
        aliqICMS: icmsElement ? parseNumber(icmsElement.pICMS) : 0,
        aliqIPI: ipiElement ? parseNumber(ipiElement.pIPI) : 0,
        valorIPI: ipiElement ? parseNumber(ipiElement.vIPI) : 0,
      };
  });

  const enderEmit = emit?.enderEmit;
  const enderDest = dest?.enderDest;
  const transporta = transp?.transporta;
  const veicTransp = transp?.veicTransp;
  const vol = transp?.vol;

  const duplicatas: NFEData["duplicatas"] = (cobr?.dup || []).map((dup: any) => ({
      numero: getString(dup.nDup),
      vencimento: formatDate(getString(dup.dVenc)),
      valor: parseNumber(dup.vDup),
    }));

  const dhEmi = getString(ide.dhEmi) || getString(ide.dEmi);
  const dhSaiEnt = getString(ide.dhSaiEnt) || getString(ide.dSaiEnt);
  
  const informacoesComplementares = getString(infAdic?.infCpl);
  const descricaoProdutos = itens.map(i => i.descricao).join(" ");
  
  return {
    tipo,
    numero: getString(ide.nNF),
    serie: getString(ide.serie),
    dataEmissao: formatDate(dhEmi),
    horaEmissao: formatTime(dhEmi),
    dataEntradaSaida: formatDate(dhSaiEnt),
    horaEntradaSaida: formatTime(dhSaiEnt) || formatTime(getString(ide.hSaiEnt)),
    chaveAcesso: getString(protNFe?.chNFe) || getString(infNFe['@_Id']).replace("NFe", ""),
    protocolo: getString(protNFe?.nProt),
    naturezaOperacao: getString(ide.natOp),
    tipoOperacao: getString(ide.tpNF) as "0" | "1" || "1",
    folha: "1/1",
    terminalEntrega: extractTerminalEntrega(informacoesComplementares),
    transbordo: extractTransbordo(informacoesComplementares),
    retirada: extractRetirada(informacoesComplementares),
    tipoProduto: detectTipoProduto(descricaoProdutos, informacoesComplementares),
    emitente: {
        cnpj: formatCNPJ(getString(emit.CNPJ)),
        nome: getString(emit.xNome),
        nomeFantasia: getString(emit.xFant),
        endereco: getString(enderEmit.xLgr),
        numero: getString(enderEmit.nro),
        bairro: getString(enderEmit.xBairro),
        cidade: getString(enderEmit.xMun),
        uf: getString(enderEmit.UF),
        cep: formatCEP(getString(enderEmit.CEP)),
        telefone: formatPhone(getString(enderEmit.fone)),
        inscricaoEstadual: getString(emit.IE),
        inscricaoEstadualST: getString(emit.IEST),
      },
      destinatario: {
        cpfCnpj: formatCPFCNPJ(getString(dest.CNPJ) || getString(dest.CPF)),
        nome: getString(dest.xNome),
        endereco: getString(enderDest.xLgr),
        numero: getString(enderDest.nro),
        bairro: getString(enderDest.xBairro),
        cidade: getString(enderDest.xMun),
        uf: getString(enderDest.UF),
        cep: formatCEP(getString(enderDest.CEP)),
        telefone: formatPhone(getString(dest.fone)),
        email: getString(dest.email),
        inscricaoEstadual: getString(dest.IE),
      },
      transportador: {
        nome: getString(transporta?.xNome),
        cpfCnpj: formatCPFCNPJ(getString(transporta?.CNPJ) || getString(transporta?.CPF)),
        endereco: getString(transporta?.xEnder),
        cidade: getString(transporta?.xMun),
        uf: getString(transporta?.UF),
        inscricaoEstadual: getString(transporta?.IE),
        fretePorConta: getString(transp.modFrete),
        codigoANTT: getString(veicTransp?.RNTC),
        placaVeiculo: getString(veicTransp?.placa),
        ufVeiculo: getString(veicTransp?.UF),
        quantidade: parseNumber(vol?.qVol),
        especie: getString(vol?.esp),
        marca: getString(vol?.marca),
        numeracao: getString(vol?.nVol),
        pesoLiquido: parseNumber(vol?.pesoL),
        pesoBruto: parseNumber(vol?.pesoB),
      },
      itens,
      impostos: {
        baseCalcICMS: parseNumber(total.vBC),
        valorICMS: parseNumber(total.vICMS),
        baseCalcICMSST: parseNumber(total.vBCST),
        valorICMSST: parseNumber(total.vST),
        valorFrete: parseNumber(total.vFrete),
        valorSeguro: parseNumber(total.vSeg),
        desconto: parseNumber(total.vDesc),
        outrasDesp: parseNumber(total.vOutro),
        valorIPI: parseNumber(total.vIPI),
        valorProdutos: parseNumber(total.vProd),
        valorTotal: parseNumber(total.vNF),
      },
      fatura: cobr?.fat ? {
        numero: getString(cobr.fat.nFat),
        valorOriginal: parseNumber(cobr.fat.vOrig),
        valorDesconto: parseNumber(cobr.fat.vDesc),
        valorLiquido: parseNumber(cobr.fat.vLiq),
      } : { numero: "", valorOriginal: 0, valorDesconto: 0, valorLiquido: 0 },
      duplicatas,
      informacoesComplementares: getString(infAdic?.infCpl),
      informacoesFisco: getString(infAdic?.infAdFisco),
  }
}

function parseNFSeData(nfseContainer: any, tipo: "NFSe"): NFEData {
  const nfse = nfseContainer.Nfse || nfseContainer;
  const infNfse = nfse.InfNfse;
  if (!infNfse) throw new Error("Estrutura de NFSe inválida: tag <InfNfse> não encontrada.");

  const prestador = infNfse.PrestadorServico;
  const tomador = infNfse.TomadorServico;
  const servico = infNfse.Servico.Valores;
  const discriminacao = infNfse.Servico.Discriminacao;

  const valorServicos = parseNumber(servico.ValorServicos)
  
  return {
    tipo,
    numero: getString(infNfse.Numero),
    serie: getString(infNfse.Serie) || "1",
    dataEmissao: formatDate(getString(infNfse.DataEmissao)),
    horaEmissao: formatTime(getString(infNfse.DataEmissao)),
    dataEntradaSaida: "",
    horaEntradaSaida: "",
    chaveAcesso: getString(infNfse.CodigoVerificacao),
    protocolo: "",
    naturezaOperacao: "Prestacao de Servicos",
    tipoOperacao: "1",
    folha: "1/1",
    terminalEntrega: "",
    transbordo: "",
    retirada: "",
    tipoProduto: "OUTRO",
    emitente: {
        cnpj: formatCNPJ(getString(prestador.IdentificacaoPrestador.Cnpj)),
        nome: getString(prestador.RazaoSocial),
        nomeFantasia: getString(prestador.NomeFantasia),
        endereco: getString(prestador.Endereco.Endereco),
        numero: getString(prestador.Endereco.Numero),
        bairro: getString(prestador.Endereco.Bairro),
        cidade: getString(prestador.Endereco.CodigoMunicipio),
        uf: getString(prestador.Endereco.Uf),
        cep: formatCEP(getString(prestador.Endereco.Cep)),
        telefone: formatPhone(getString(prestador.Contato.Telefone)),
        inscricaoEstadual: getString(prestador.IdentificacaoPrestador.InscricaoMunicipal),
        inscricaoEstadualST: "",
      },
      destinatario: {
        cpfCnpj: formatCPFCNPJ(getString(tomador.IdentificacaoTomador.CpfCnpj.Cnpj) || getString(tomador.IdentificacaoTomador.CpfCnpj.Cpf)),
        nome: getString(tomador.RazaoSocial),
        endereco: getString(tomador.Endereco.Endereco),
        numero: getString(tomador.Endereco.Numero),
        bairro: getString(tomador.Endereco.Bairro),
        cidade: getString(tomador.Endereco.CodigoMunicipio),
        uf: getString(tomador.Endereco.Uf),
        cep: formatCEP(getString(tomador.Endereco.Cep)),
        telefone: formatPhone(getString(tomador.Contato.Telefone)),
        email: getString(tomador.Contato.Email),
        inscricaoEstadual: "",
      },
    transportador: { nome: "", cpfCnpj: "", endereco: "", cidade: "", uf: "", inscricaoEstadual: "", fretePorConta: "", codigoANTT: "", placaVeiculo: "", ufVeiculo: "", quantidade: 0, especie: "", marca: "", numeracao: "", pesoLiquido: 0, pesoBruto: 0 },
    itens: [
      {
        numero: "1",
        codigo: getString(infNfse.Servico.ItemListaServico),
        descricao: getString(discriminacao),
        ncm: "",
        cst: "",
        cfop: "",
        unidade: "SV",
        quantidade: 1,
        valorUnitario: valorServicos,
        valorTotal: valorServicos,
        baseICMS: 0,
        valorICMS: 0,
        aliqICMS: 0,
        aliqIPI: 0,
        valorIPI: 0,
      },
    ],
    impostos: {
      baseCalcICMS: 0,
      valorICMS: 0,
      baseCalcICMSST: 0,
      valorICMSST: 0,
      valorFrete: 0,
      valorSeguro: 0,
      desconto: parseNumber(servico.DescontoIncondicionado),
      outrasDesp: 0,
      valorIPI: 0,
      valorProdutos: valorServicos,
      valorTotal: parseNumber(servico.ValorLiquidoNfse) || valorServicos,
    },
    fatura: { numero: "", valorOriginal: 0, valorDesconto: 0, valorLiquido: 0 },
    duplicatas: [],
    informacoesComplementares: getString(discriminacao),
    informacoesFisco: "",
  }
}

function parseGenericData(tipo: "NFe" | "NFSe" | "Desconhecido"): NFEData {
  return {
    tipo,
    numero: "", serie: "", dataEmissao: new Date().toLocaleDateString("pt-BR"), horaEmissao: "",
    dataEntradaSaida: "", horaEntradaSaida: "", chaveAcesso: "", protocolo: "", naturezaOperacao: "",
    tipoOperacao: "1", folha: "1/1", terminalEntrega: "", transbordo: "", retirada: "", tipoProduto: "OUTRO",
    emitente: { cnpj: "", nome: "", nomeFantasia: "", endereco: "", numero: "", bairro: "", cidade: "", uf: "", cep: "", telefone: "", inscricaoEstadual: "", inscricaoEstadualST: "" },
    destinatario: { cpfCnpj: "", nome: "", endereco: "", numero: "", bairro: "", cidade: "", uf: "", cep: "", telefone: "", email: "", inscricaoEstadual: "" },
    transportador: { nome: "", cpfCnpj: "", endereco: "", cidade: "", uf: "", inscricaoEstadual: "", fretePorConta: "", codigoANTT: "", placaVeiculo: "", ufVeiculo: "", quantidade: 0, especie: "", marca: "", numeracao: "", pesoLiquido: 0, pesoBruto: 0 },
    itens: [],
    impostos: { baseCalcICMS: 0, valorICMS: 0, baseCalcICMSST: 0, valorICMSST: 0, valorFrete: 0, valorSeguro: 0, desconto: 0, outrasDesp: 0, valorIPI: 0, valorProdutos: 0, valorTotal: 0 },
    fatura: { numero: "", valorOriginal: 0, valorDesconto: 0, valorLiquido: 0 },
    duplicatas: [],
    informacoesComplementares: "", informacoesFisco: "",
  }
}

// Formatters
function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    if(isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("pt-BR", { timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
     if(isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("pt-BR")
  } catch {
    return ""
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

// Funções para extrair informações das informações complementares
function extractTerminalEntrega(infComplementares: string): string {
  if (!infComplementares) return ""

  // Padrão 1: Busca por "ENTREGA: [NOME DO TERMINAL]"
  let match = infComplementares.match(/ENTREGA:\s*([^,;.]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Padrão 2: Busca por "ALFANDEGADO ... [NOME DO TERMINAL]"
  // Procura por palavras-chave de terminal após a palavra "ALFANDEGADO"
  match = infComplementares.match(/ALFANDEGADO(?:[\s\S]*?)((?:TERMINAL|PORTO|TEG|TEAG|TGG|TIPLAM)[\w\s.,-]+)/i);
  if (match && match[1]) {
    // Limpa o resultado, removendo pontuação extra do final
    return match[1].trim().replace(/[.,;]+$/, "").trim();
  }

  return ""
}

function extractTransbordo(infComplementares: string): string {
  if (!infComplementares) return ""

  // Padrão 1: Busca por "TRANSBORDO: [VALOR]"
  let match = infComplementares.match(/TRANSBORDO:\s*([^,;.]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Padrão 2: Busca por "cidade: [VALOR]"
  match = infComplementares.match(/cidade:\s*([^,;.]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return "";
}

function extractRetirada(infComplementares: string): string {
  if (!infComplementares) return ""
  const match = infComplementares.match(/RETIRADA:\s*([^,;.]+)/i)
  return match ? match[1].trim() : "";
}

function detectTipoProduto(descricaoProduto: string, infComplementares: string): "SOJA" | "MILHO" | "ACUCAR" | "OUTRO" {
  const texto = (descricaoProduto + " " + infComplementares).toUpperCase()
  
  if (texto.includes("SOJA")) return "SOJA"
  if (texto.includes("MILHO")) return "MILHO"
  if (texto.includes("ACUCAR") || texto.includes("AÇUCAR") || texto.includes("AÇÚCAR")) return "ACUCAR"
  
  return "OUTRO"
}
