export type UserRole = 'ADMIN' | 'GERENTE' | 'VENDEDOR';

export interface VendedorSaldoNegativo {
  id: string;
  vendedorId: string;
  semanaRef: string;
  periodoInicio: string;
  periodoFim: string;
  valorDevido: number;
  valorQuitado: number;
  quitado: boolean;
  createdAt: string;
  quitadoEm?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  filialId?: string; // Gerente and Vendedor belong to a Filial
  funcaoId?: string; // Vendedor has a Funcao (e.g. Cabeleireiro, Manicure)
  status: 'ATIVO' | 'INATIVO';
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface Filial {
  id: string;
  name: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  status: 'ATIVA' | 'INATIVA';
  managerId?: string;
  createdAt: string;
}

export interface Funcao {
  id: string;
  name: string;
  description: string;
  status: 'ATIVA' | 'INATIVA';
  createdAt: string;
}

export interface Servico {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  commissionPercent: number; // e.g. 30 means 30%
  status: 'ATIVO' | 'INATIVO';
  funcaoId?: string;
  createdAt: string;
}

export interface ServicoEditLog {
  date: string;
  userId: string;
  userName: string;
  previousValue: number;
  newValue: number;
  reason: string;
  camposAlterados?: string[];
}

export interface RegistroServico {
  id: string;
  filialId: string;
  vendedorId: string;
  servicoId: string;
  quantidade?: number; // Quantidade de atendimentos realizados (padrão 1)
  valorUnitario?: number; // Valor unitário de cada atendimento
  valorCobrado: number; // Valor total cobrado (quantidade * valorUnitario)
  commissionPercent: number;
  valorComissao: number; // (valorCobrado * commissionPercent) / 100
  valorSalao: number; // valorCobrado - valorComissao
  dataHora: string;
  status: 'PENDENTE' | 'APROVADO' | 'REPROVADO' | 'PAGO';
  motivoReprovacao?: string;
  justificativaReprovacao?: string;
  dataAprovacao?: string;
  aprovadoPorId?: string;
  aprovadoPorNome?: string;
  editHistory?: ServicoEditLog[];
  weeklyPaymentId?: string;
  observacoes?: string;
  notificacao?: string;
  notificacaoData?: string;
  notificacaoAutor?: string;
  createdAt: string;
}

export interface Vale {
  id: string;
  vendedorId: string;
  filialId: string;
  valor: number;
  valorSolicitado?: number;
  motivo: string;
  dataSolicitacao: string;
  data?: string;
  status: 'PENDENTE' | 'APROVADO' | 'REPROVADO' | 'PAGO' | 'DESCONTADO';
  motivoReprovacao?: string;
  justificativaReprovacao?: string;
  aprovadoPorId?: string;
  aprovadoPorNome?: string;
  observacaoAdmin?: string;
  weeklyPaymentId?: string;
  createdAt: string;
}

export interface PagamentoSemanal {
  id: string;
  filialId: string;
  vendedorId: string;
  semanaRef?: string;
  periodoInicio: string;
  periodoFim: string;
  servicosIds: string[];
  servicoIds?: string[];
  valesIds: string[];
  valeIds?: string[];
  totalComissaoBruta: number;
  totalComissao?: number;
  totalValesDescontados: number;
  valesDescontados?: number;
  valorLiquidoPago: number;
  valorLiquido?: number;
  totalServicosCount?: number;
  faturamentoRealizado?: number;
  outrosDescontos?: number;
  status: 'PENDENTE' | 'PROCESSANDO' | 'PAGO';
  dataPagamento: string;
  formaPagamento: 'PIX' | 'TRANSFERENCIA' | 'DINHEIRO' | 'CHEQUE' | 'CARTAO' | 'OUTRO';
  observacoes?: string;
  observacao?: string;
  aprovadoPorId?: string;
  aprovadoPorNome?: string;
  pagoPorId?: string;
  pagoPorNome?: string;
  createdAt: string;
  saldoNegativoCarregado?: number;
  saldoNegativoQuitado?: boolean;
  gerouSaldoNegativo?: boolean;
}

export interface AuditoriaLog {
  id: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioRole: UserRole;
  acao: string;
  registroTipo: 'FILIAL' | 'GERENTE' | 'VENDEDOR' | 'FUNCAO' | 'CATEGORIA' | 'SERVICO' | 'REGISTRO_SERVICO' | 'SERVICO_REGISTRO' | 'VALE' | 'PAGAMENTO' | 'PERFIL' | 'AUTH' | 'USUARIO' | 'CONFIG' | 'SISTEMA';
  registroId: string;
  registroDescricao: string;
  valorAnterior?: string;
  novoValor?: string;
  detalhes?: string;
}

export interface MenuItemCustomization {
  customImageUrl?: string;
  lucideIconName?: string;
  showNumber?: boolean;
  customNumber?: string;
  customTitle?: string;
  iconSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface SystemConfig {
  salonNetworkName: string;
  logoUrl?: string;
  logoType?: 'image' | 'video';
  slogan: string;
  primaryColor: string;
  autoApproveByManager: boolean;
  closingDayOfWeek: string;
  currencySymbol: string;
  menuCustomizations?: Record<string, MenuItemCustomization>;
  backupEnabled?: boolean;
  backupFrequency?: 'SEMANAL' | 'MENSAL';
  lastBackupAt?: string;
  nextBackupAt?: string;
}

export type ActiveModule = 
  | 'DASHBOARD'
  | 'FILIAIS'
  | 'GERENTES'
  | 'VENDEDORES'
  | 'FUNCOES'
  | 'SERVICOS'
  | 'REGISTRAR_SERVICO'
  | 'MEUS_SERVICOS'
  | 'MINHAS_COMISSOES'
  | 'SOLICITAR_VALE'
  | 'MEUS_VALES'
  | 'MEUS_PAGAMENTOS'
  | 'VENDEDOR_REGISTRO'
  | 'VENDEDOR_SERVICOS'
  | 'VENDEDOR_COMISSOES'
  | 'VENDEDOR_VALES'
  | 'VENDEDOR_PAGAMENTOS'
  | 'APROVACOES'
  | 'VALES'
  | 'PAGAMENTOS'
  | 'RELATORIOS'
  | 'AUDITORIA'
  | 'PERFIL'
  | 'CONFIGURACOES';
