export type ApprovalStatus = 'PENDENTE' | 'APROVADO' | 'REPROVADO' | 'PAGO' | 'ALL';
export type ValeStatus = 'PENDENTE' | 'APROVADO' | 'DESCONTADO' | 'REPROVADO' | 'ALL';

export const getDefaultApprovalStatus = (role?: string): ApprovalStatus => {
  // SEMPRE abre com PENDENTE selecionado para NÃO precisar rolar a tela
  return 'PENDENTE';
};

export const getDefaultValeStatus = (role?: string): ValeStatus => {
  // SEMPRE abre com PENDENTE selecionado para NÃO precisar rolar a tela
  return 'PENDENTE';
};

// Prioridade de ordenação por status para quando o filtro ALL estiver selecionado
// PENDENTES SEMPRE NO TOPO, seguidos por PROCESSANDO → APROVADO → PAGO/DESCONTADO → REPROVADO
export const STATUS_PRIORITY_SERVICE: Record<string, number> = {
  PENDENTE: 0,
  PROCESSANDO: 1,
  APROVADO: 2,
  PAGO: 3,
  REPROVADO: 99,
};

export const STATUS_PRIORITY_VALE: Record<string, number> = {
  PENDENTE: 0,
  PROCESSANDO: 1,
  APROVADO: 2,
  PAGO: 3,
  DESCONTADO: 4,
  REPROVADO: 99,
};

// Helpers de ordenação (PENDENTES PRIMEIRO, depois mais recente)
export function sortByServiceStatusPriority<T extends { status: string; dataHora?: string; createdAt?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const oa = STATUS_PRIORITY_SERVICE[a.status] ?? 99;
    const ob = STATUS_PRIORITY_SERVICE[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(b.dataHora || b.createdAt || 0).getTime() - new Date(a.dataHora || a.createdAt || 0).getTime();
  });
}

export function sortByValeStatusPriority<T extends { status: string; dataSolicitacao?: string; data?: string; createdAt?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const oa = STATUS_PRIORITY_VALE[a.status] ?? 99;
    const ob = STATUS_PRIORITY_VALE[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(b.dataSolicitacao || b.data || b.createdAt || 0).getTime() - new Date(a.dataSolicitacao || a.data || a.createdAt || 0).getTime();
  });
}
