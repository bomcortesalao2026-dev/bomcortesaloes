import React, { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Download, 
  Printer,
  FileText,
  Scissors,
  CreditCard,
  Wallet,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { RegistroServico, User, Servico, Vale } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency, exportToCsv, printStyledReport } from '../utils/exportUtils';

interface VendedorMinhasComissoesProps {
  currentUser: User;
}

export const VendedorMinhasComissoes: React.FC<VendedorMinhasComissoesProps> = ({ currentUser }) => {
  const [registros, setRegistros] = useState<RegistroServico[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [lastRefreshMc, setLastRefreshMc] = useState<Date>(new Date());

  const isRefreshingMc = useRef<boolean>(false);

  const refreshData = () => {
    const allRegs = StorageService.getRegistrosServicos().filter(r => r.vendedorId === currentUser.id);
    setRegistros(allRegs);
    setServicos(StorageService.getServicos());
    setVales(StorageService.getVales().filter(v => v.vendedorId === currentUser.id));
  };

  const forceRefreshMc = async () => {
    if (isRefreshingMc.current) return;
    isRefreshingMc.current = true;
    try {
      await StorageService.refreshForScreen('EMPLOYEE');
    } catch (_) {}
    refreshData();
    setLastRefreshMc(new Date());
    setTimeout(() => { isRefreshingMc.current = false; }, 400);
  };

  useEffect(() => {
    refreshData();

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') forceRefreshMc();
    };
    forceRefreshMc();
    document.addEventListener('visibilitychange', refreshOnReturn);

    return () => {
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [currentUser]);

  const totalQuantidadeServicos = registros.reduce((sum, r) => sum + (r.quantidade || 1), 0);
  const totalValorBruto = registros.reduce((sum, r) => sum + (r.valorCobrado || 0), 0);
  const totalComissoesBrutas = registros.reduce((sum, r) => sum + (r.valorComissao || 0), 0);

  const valesValidos = vales.filter(v => v.status !== 'REPROVADO');
  const totalVales = valesValidos.reduce((sum, v) => sum + (v.valor || 0), 0);

  const totalValorLiquido = totalComissoesBrutas - totalVales;
  const isSaldoNegativo = totalValorLiquido < 0;

  const approvedServices = registros.filter(r => r.status === 'APROVADO');
  const pendingServices = registros.filter(r => r.status === 'PENDENTE');
  const paidServices = registros.filter(r => r.status === 'PAGO');

  const comissaoAprovadaAcumulada = approvedServices.reduce((sum, r) => sum + r.valorComissao, 0);
  const comissaoPendente = pendingServices.reduce((sum, r) => sum + r.valorComissao, 0);
  const comissaoPaga = paidServices.reduce((sum, r) => sum + r.valorComissao, 0);

  const handleExportCSV = () => {
    const exportData = registros.map(r => {
      const s = servicos.find(srv => srv.id === r.servicoId);
      return {
        'ID': r.id,
        'Data': new Date(r.dataHora).toLocaleDateString('pt-BR'),
        'Servico': s?.name || 'Serviço',
        'Quantidade': r.quantidade || 1,
        'Valor Cobrado': r.valorCobrado,
        'Comissao (%)': r.commissionPercent,
        'Valor Comissao': r.valorComissao,
        'Status': r.status,
      };
    });
    exportToCsv(exportData, `extrato_comissoes_${currentUser.name.replace(/\s+/g, '_')}`);
  };

  const handlePrint = () => {
    printStyledReport(`
      <h2>Extrato Individual de Comissões</h2>
      <p><strong>Profissional:</strong> ${currentUser.name} (${currentUser.email})</p>
      <p><strong>Total de Atendimentos:</strong> ${totalQuantidadeServicos}</p>
      <p><strong>Valor Bruto:</strong> ${formatCurrency(totalValorBruto)}</p>
      <p><strong>Comissões Brutas:</strong> ${formatCurrency(totalComissoesBrutas)}</p>
      <p><strong>Vales / Adiantamentos:</strong> ${formatCurrency(totalVales)}</p>
      <p><strong>Valor Líquido Previsto:</strong> ${formatCurrency(totalValorLiquido)}</p>
      <table class="report-table">
        <thead><tr><th>Data</th><th>Serviço</th><th>Qtd</th><th>Valor Cobrado</th><th>Comissão</th><th>Status</th></tr></thead>
        <tbody>
          ${registros.map(r => {
            const s = servicos.find(srv => srv.id === r.servicoId);
            return `<tr>
              <td>${new Date(r.dataHora).toLocaleDateString('pt-BR')}</td>
              <td>${s?.name || ''}</td>
              <td>${r.quantidade || 1}</td>
              
              <td>${formatCurrency(r.valorCobrado)}</td>
              <td>${formatCurrency(r.valorComissao)}</td>
              <td>${r.status}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `, `Extrato Comissões - ${currentUser.name}`);
  };

  // Estilo base dos cards
  const cardBase = 'p-4 rounded-2xl border shadow-[0_4px_20px_rgba(0,0,0,0.4)]';
  const cardDark = `${cardBase} bg-[#0C1F31]/90 border-[#C8A45D]/25`;

  return (
    <div className="space-y-6">

      {/* Alerta saldo negativo */}
      {isSaldoNegativo && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/95 via-[#1B2633] to-[#0B1723] border-2 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/25 border-2 border-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            </div>
            <div>
              <div className="font-black text-rose-200 text-sm">⚠️ ATENÇÃO: SEU SALDO ESTÁ NEGATIVO — {formatCurrency(totalValorLiquido)}</div>
              <div className="text-rose-300/90 text-[11px] mt-0.5">
                Vales ({formatCurrency(totalVales)}) maiores que comissões ({formatCurrency(totalComissoesBrutas)}).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#C8A45D]" />
            Minhas Comissões &amp; Saldo
          </h2>
          <p className="text-xs text-[#B49A73] mt-0.5">
            Painel financeiro individual com comissões acumuladas e projeção de fechamento semanal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={forceRefreshMc}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/60 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: isRefreshingMc.current ? '0.8s' : '0s', animationIterationCount: isRefreshingMc.current ? 'infinite' : '0' }} />
            <span>Atualizar</span>
          </button>
          <span className="text-[10px] font-mono text-[#B49A73] ml-1">
            Último: {lastRefreshMc.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#C8A45D]/10 border border-[#C8A45D]/30 text-[#E2C98A] hover:bg-[#C8A45D]/20 hover:border-[#C8A45D]/60 text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#C8A45D]" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#C8A45D]/10 border border-[#C8A45D]/30 text-[#E2C98A] hover:bg-[#C8A45D]/20 hover:border-[#C8A45D]/60 text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C8A45D]" />
            <span>Imprimir Extrato</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Quantidade */}
        <div className={cardDark}>
          <div className="flex items-center justify-between text-xs font-mono text-[#B49A73] mb-1">
            <span className="font-bold uppercase">Quantidade de Serviços</span>
            <Scissors className="w-4 h-4 text-[#C8A45D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{totalQuantidadeServicos}</div>
          <div className="text-xs text-[#6B7F96] mt-1 font-mono">{registros.length} lançamentos efetuados</div>
        </div>

        {/* 2. Valor Bruto */}
        <div className={cardDark}>
          <div className="flex items-center justify-between text-xs font-mono text-[#B49A73] mb-1">
            <span className="font-bold uppercase">Valor Bruto</span>
            <DollarSign className="w-4 h-4 text-[#C8A45D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{formatCurrency(totalValorBruto)}</div>
          <div className="text-xs text-[#C8A45D] mt-1 font-mono">Comissão bruta: {formatCurrency(totalComissoesBrutas)}</div>
        </div>

        {/* 3. Vales */}
        <div className={cardDark}>
          <div className="flex items-center justify-between text-xs font-mono text-[#B49A73] mb-1">
            <span className="font-bold uppercase">Vales</span>
            <CreditCard className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">{formatCurrency(totalVales)}</div>
          <div className="text-xs text-[#6B7F96] mt-1 font-mono">{vales.length} solicitação(ões) de adiantamento</div>
        </div>

        {/* 4. Valor Líquido */}
        <div className={`${cardBase} transition-all ${
          isSaldoNegativo
            ? 'bg-rose-950/40 border-2 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
            : 'bg-gradient-to-br from-[#0D2133]/90 to-[#0C1F31]/90 border-2 border-[#C8A45D]/40'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className={`font-bold uppercase ${isSaldoNegativo ? 'text-rose-400' : 'text-[#B49A73]'}`}>
              {isSaldoNegativo ? 'VALOR LÍQUIDO (DÉBITO)' : 'Valor Líquido'}
            </span>
            {isSaldoNegativo
              ? <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              : <Wallet className="w-4 h-4 text-[#C8A45D]" />
            }
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${isSaldoNegativo ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {formatCurrency(totalValorLiquido)}
          </div>
          <div className={`text-xs mt-1 font-mono ${isSaldoNegativo ? 'text-rose-400' : 'text-[#6B7F96]'}`}>
            Comissões ({formatCurrency(totalComissoesBrutas)}) - Vales ({formatCurrency(totalVales)})
          </div>
        </div>

      </div>

      {/* Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#0C1F31]/90 border border-emerald-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-mono font-bold text-[#B49A73] uppercase tracking-wider">Aprovadas</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{formatCurrency(comissaoAprovadaAcumulada)}</div>
          </div>
        </div>

        <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#0C1F31]/90 border shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${
          comissaoPendente > 0
            ? 'chip-status-pendente-ativo border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.35)] animate-pulse'
            : 'border-[#C8A45D]/30'
        }`}>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            comissaoPendente > 0
              ? 'bg-amber-500/15 border-amber-500/50'
              : 'bg-[#C8A45D]/15 border-[#C8A45D]/40'
          }`}>
            <Clock className={`w-5 h-5 ${comissaoPendente > 0 ? 'text-amber-400' : 'text-[#C8A45D]'}`} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: comissaoPendente > 0 ? '#F59E0B' : '#B49A73' }}>Pendentes</div>
            <div className={`text-xl font-black font-mono mt-0.5 ${comissaoPendente > 0 ? 'text-amber-300' : 'text-[#E2C98A]'}`}>{formatCurrency(comissaoPendente)}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#0C1F31]/90 border border-sky-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-mono font-bold text-[#B49A73] uppercase tracking-wider">Já Pagas</div>
            <div className="text-xl font-black text-sky-400 font-mono mt-0.5">{formatCurrency(comissaoPaga)}</div>
          </div>
        </div>

      </div>

      {/* Tabela de extrato */}
      <div className="rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/20 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-[#C8A45D]/15 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C8A45D]" />
            Extrato Detalhado de Comissões
          </h3>
          <span className="text-xs text-[#B49A73] font-mono">{registros.length} lançamentos</span>
        </div>

        <div className={`overflow-x-auto custom-scrollbar ${registros.length > 10 ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
          <table className="w-full min-w-[800px] text-left text-sm whitespace-nowrap">
            <thead className={`text-[#C8A45D] font-mono border-b border-[#C8A45D]/15 uppercase text-xs ${registros.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`} style={{ background: registros.length > 10 ? '#10283D' : 'rgba(200,164,93,0.07)' }}>
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Serviço Realizado</th>
                  <th className="py-3 px-4">Total Cobrado</th>
                <th className="py-3 px-4">% Comissão</th>
                <th className="py-3 px-4">Sua Comissão</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8A45D]/10">
              {registros.map((r) => {
                const s = servicos.find(srv => srv.id === r.servicoId);
                return (
                  <tr key={r.id} className="hover:bg-[#C8A45D]/05 transition-colors" style={{ background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,164,93,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="py-3 px-4 font-mono text-[#A8B8CC] text-xs">
                      {new Date(r.dataHora).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{s?.name || 'Serviço'}</td>
                    
                    <td className="py-3 px-4 font-mono font-bold text-white">{formatCurrency(r.valorCobrado)}</td>
                    <td className="py-3 px-4 font-mono text-[#E2C98A]">{r.commissionPercent}%</td>
                    <td className="py-3 px-4 font-mono text-[#C8A45D] font-bold">{formatCurrency(r.valorComissao)}</td>
                    <td className="py-3 px-4">
                      {r.status === 'PENDENTE' ? (
                        <span className="badge-pendente-alerta px-2 py-0.5 rounded text-[10px] font-mono font-bold border bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                          ⚠ PENDENTE
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          r.status === 'APROVADO'
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                            : r.status === 'PAGO'
                            ? 'bg-sky-950/40 border-sky-500/50 text-sky-400'
                            : 'bg-rose-950/40 border-rose-500/50 text-rose-400'
                        }`}>
                          {r.status === 'APROVADO' ? '✓ APROVADO' : r.status === 'PAGO' ? '💲 PAGO' : r.status === 'REPROVADO' ? '✗ REPROVADO' : r.status?.toUpperCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#6B7F96] font-mono text-sm">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
