import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  Building2, 
  TrendingUp, 
  Users, 
  Scissors, 
  CreditCard,
  PieChart as PieIcon,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  Wallet,
  Clock,
  RefreshCw
} from 'lucide-react';
import { User, Filial, Servico, RegistroServico, Vale, PagamentoSemanal, SystemConfig } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency, exportToCSV, printStyledReport } from '../utils/exportUtils';
import { MonthlyRevenueConsolidation } from './MonthlyRevenueConsolidation';
import { WeekCycleBadge } from './WeekCycleBadge';
import { calculateWeekCycle } from '../utils/dateCycleUtils';

interface RelatoriosModuleProps {
  currentUser: User;
}

export const RelatoriosModule: React.FC<RelatoriosModuleProps> = ({ currentUser }) => {
  const [reportType, setReportType] = useState<'FUNCIONARIO'>('FUNCIONARIO');

  const [selectedVendedorId, setSelectedVendedorId] = useState<string>('ALL');
  const [selectedReportDay, setSelectedReportDay] = useState<string>('');
  const [reportDayText, setReportDayText] = useState<string>('');

  const [config, setConfig] = useState<SystemConfig>(StorageService.getConfig());
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [registros, setRegistros] = useState<RegistroServico[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoSemanal[]>([]);
  const [lastRefreshRp, setLastRefreshRp] = useState<Date>(new Date());

  const isRefreshingRp = useRef<boolean>(false);

  // Filter params
  const [selectedFilialId, setSelectedFilialId] = useState<string>(
    currentUser.role === 'GERENTE' ? (currentUser.filialId || 'ALL') : 'ALL'
  );
  
  // Date range presets: default to last 30 days
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const loadData = () => {
    setConfig(StorageService.getConfig());
    setFiliais(StorageService.getFiliais());
    setUsers(StorageService.getUsers());
    setServicos(StorageService.getServicos());
    setRegistros(StorageService.getRegistrosServicos());
    setVales(StorageService.getVales());
    setPagamentos(StorageService.getPagamentos());
  };

  const forceRefreshRp = async () => {
    if (isRefreshingRp.current) return;
    isRefreshingRp.current = true;
    try {
      await StorageService.refreshForScreen('FULL');
    } catch (_) {}
    loadData();
    setLastRefreshRp(new Date());
    setTimeout(() => { isRefreshingRp.current = false; }, 400);
  };

  useEffect(() => {
    loadData();
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') forceRefreshRp();
    };
    forceRefreshRp();
    document.addEventListener('visibilitychange', refreshOnReturn);

    return () => {
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, []);

  const handleSetDatePreset = (preset: '30_DAYS' | 'THIS_MONTH' | '90_DAYS' | 'ALL') => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    setDataFim(todayStr);

    if (preset === '30_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDataInicio(d.toISOString().slice(0, 10));
    } else if (preset === 'THIS_MONTH') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setDataInicio(d.toISOString().slice(0, 10));
    } else if (preset === '90_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setDataInicio(d.toISOString().slice(0, 10));
    } else if (preset === 'ALL') {
      setDataInicio('2020-01-01');
    }
  };

  // Filter data within dates and filial
  const effectiveStartDate = selectedReportDay || dataInicio;
  const effectiveEndDate = selectedReportDay || dataFim;
  const startMs = new Date(effectiveStartDate + 'T00:00:00').getTime();
  const endMs = new Date(effectiveEndDate + 'T23:59:59.999').getTime();
  const isWithinReportDates = (value?: string) => {
    if (!value) return !selectedReportDay;
    const time = new Date(value).getTime();
    return !Number.isNaN(time) && time >= startMs && time <= endMs;
  };

  const formatDateBr = (value: string) => {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  const handleReportDayChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 4
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits;
    setReportDayText(formatted);

    if (digits.length !== 8) {
      setSelectedReportDay('');
      return;
    }

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4));
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      setSelectedReportDay(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    } else {
      setSelectedReportDay('');
    }
  };

  const filteredRegistros = registros.filter(r => {
    if (currentUser.role === 'GERENTE' && r.filialId !== currentUser.filialId) return false;
    if (selectedFilialId !== 'ALL' && r.filialId !== selectedFilialId) return false;
    return isWithinReportDates(r.dataHora);
  });

  const filteredVales = vales.filter(v => {
    if (currentUser.role === 'GERENTE' && v.filialId !== currentUser.filialId) return false;
    if (selectedFilialId !== 'ALL' && v.filialId !== selectedFilialId) return false;
    return isWithinReportDates(v.dataSolicitacao);
  });

  const filteredPagamentos = pagamentos.filter(p => {
    if (currentUser.role === 'GERENTE' && p.filialId !== currentUser.filialId) return false;
    if (selectedFilialId !== 'ALL' && p.filialId !== selectedFilialId) return false;
    return isWithinReportDates(p.dataPagamento);
  });

  const reportSellers = users.filter(u =>
    u.role === 'VENDEDOR' &&
    (currentUser.role === 'GERENTE' ? u.filialId === currentUser.filialId : (selectedFilialId === 'ALL' || u.filialId === selectedFilialId)) &&
    (selectedVendedorId === 'ALL' || u.id === selectedVendedorId)
  );

  // Calculate aggregation based on report type
  const renderReportContent = () => {
    switch (reportType) {
      case 'FUNCIONARIO': {
        const vendedor = selectedVendedorId !== 'ALL' ? users.find(u => u.id === selectedVendedorId) : null;
        const filialDoVend = vendedor ? filiais.find(f => f.id === vendedor.filialId) : null;

        const funcRegs = filteredRegistros
          .filter(r => selectedVendedorId === 'ALL' ? true : r.vendedorId === selectedVendedorId)
          .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

        const funcVales = filteredVales
          .filter(v => selectedVendedorId === 'ALL' ? true : v.vendedorId === selectedVendedorId)
          .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());

        const aprovRegs = funcRegs.filter(r => r.status === 'APROVADO' || r.status === 'PAGO');
        const totalAtend = aprovRegs.reduce((s, r) => s + (r.quantidade || 1), 0);
        const totalFaturado = aprovRegs.reduce((s, r) => s + r.valorCobrado, 0);
        const totalComissao = aprovRegs.reduce((s, r) => s + r.valorComissao, 0);
        const totalValesValor = funcVales.filter(v => v.status === 'APROVADO' || v.status === 'DESCONTADO' || v.status === 'PAGO').reduce((s, v) => s + v.valor, 0);
        const saldoLiquido = Math.max(0, totalComissao - totalValesValor);

        const statusClass = (status: string) => {
          if (status === 'APROVADO') return 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300';
          if (status === 'PENDENTE') return 'bg-amber-950/60 border-amber-500/50 text-amber-300';
          if (status === 'PAGO' || status === 'DESCONTADO') return 'bg-blue-950/60 border-blue-500/50 text-blue-300';
          return 'bg-rose-950/60 border-rose-500/50 text-rose-300';
        };

        return (
          <div className="space-y-6">

            {/* ── CICLO SEMANAL BADGE ── */}
            <WeekCycleBadge />

            {/* ── HERO CARD: funcionário + KPIs ── */}
            <div className="relative overflow-hidden rounded-3xl border border-[#C8A45D]/40 bg-gradient-to-br from-[#1a0804] via-[#120502] to-[#07131F] shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
              {/* Background glow */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#C8A45D]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#C8A45D]/5 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 p-5 sm:p-6">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#C8A45D]/20">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#C8A45D] to-[#A87F2E] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,90,0,0.5)]">
                      <span className="text-2xl font-black text-white">
                        {vendedor ? vendedor.name.charAt(0).toUpperCase() : '👤'}
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#D8B56B] uppercase tracking-widest mb-0.5">
                        {selectedVendedorId === 'ALL' ? 'Todos os Funcionários' : 'Funcionário Selecionado'}
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {vendedor?.name || 'Todos os Profissionais'}
                      </div>
                      {filialDoVend && (
                        <div className="text-xs text-[#B49A73] mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8A45D] inline-block" />
                          {filialDoVend.name} • {filialDoVend.city}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* KPI grid – 2 cols on mobile, 4 on desktop */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Atendimentos */}
                  <div className="p-4 rounded-2xl bg-[#0B1A29]/80 border border-[#C8A45D]/30 flex flex-col gap-1 group hover:border-[#D9B76C] transition-colors">
                    <div className="text-[9px] font-mono text-[#D7C08E] uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <Scissors className="w-3 h-3 text-[#C8A45D]" /> Atendimentos
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1">{totalAtend}</div>
                    <div className="text-[10px] text-[#B49A73]">{aprovRegs.length} registros aprovados</div>
                  </div>

                  {/* 2. Faturado */}
                  <div className="p-4 rounded-2xl bg-[#0B1A29]/80 border border-emerald-500/30 flex flex-col gap-1 group hover:border-emerald-400 transition-colors">
                    <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Faturado
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-1">{formatCurrency(totalFaturado)}</div>
                    <div className="text-[10px] text-emerald-500/70">Total bruto gerado</div>
                  </div>

                  {/* 3. Comissão Bruta */}
                  <div className="p-4 rounded-2xl bg-[#0B1A29]/80 border border-[#C8A45D]/30 flex flex-col gap-1 group hover:border-[#D9B76C] transition-colors">
                    <div className="text-[9px] font-mono text-[#D7C08E] uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3 text-[#C8A45D]" /> Comissão
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#F1DEB5] font-mono mt-1">{formatCurrency(totalComissao)}</div>
                    <div className="text-[10px] text-[#B49A73]">Ganhos do profissional</div>
                  </div>

                  {/* 4. Saldo Líquido */}
                  <div className="p-4 rounded-2xl bg-[#0a1a0a]/80 border border-emerald-500/40 flex flex-col gap-1 group hover:border-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                    <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <Wallet className="w-3 h-3" /> Saldo Líquido
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-1">{formatCurrency(saldoLiquido)}</div>
                    <div className="text-[10px] text-rose-400/80">
                      {totalValesValor > 0 ? `- ${formatCurrency(totalValesValor)} vales` : 'Sem vales a descontar'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selector of Report Type & Filter Parameters */}
            <div className="p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 space-y-3 text-xs font-mono">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[#D7C08E] mb-1 uppercase font-bold">Tipo de Relatório</label>
                  <select
                    value={reportType}
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  >
                    <option value="FUNCIONARIO">👤 Relatório por Funcionário (Vales, Serviços e Comissões)</option>
                  </select>
                </div>

                {currentUser.role === 'ADMIN' && (
                  <div>
                    <label className="block text-[#D7C08E] mb-1 uppercase font-bold">Filial</label>
                    <select
                      value={selectedFilialId}
                      onChange={(e) => {
                        setSelectedFilialId(e.target.value);
                        setSelectedVendedorId('ALL');
                      }}
                      className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                    >
                      <option value="ALL">Todas as Filiais</option>
                      {filiais.map(filial => <option key={filial.id} value={filial.id}>{filial.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#D7C08E] mb-1 uppercase font-bold">Funcionário</label>
                    <select
                      value={selectedVendedorId}
                      onChange={(e) => setSelectedVendedorId(e.target.value)}
                      className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                    >
                      <option value="ALL">Todos os Funcionários</option>
                      {users
                        .filter(u => u.role === 'VENDEDOR' && (currentUser.role === 'GERENTE' ? u.filialId === currentUser.filialId : (selectedFilialId === 'ALL' || u.filialId === selectedFilialId)))
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#D7C08E] mb-1 uppercase font-bold">Filtrar por dia</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="dd/mm/aaaa"
                        value={reportDayText}
                        onChange={(e) => handleReportDayChange(e.target.value)}
                        className="min-w-0 flex-1 bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                      />
                      {selectedReportDay && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReportDay('');
                            setReportDayText('');
                          }}
                          className="shrink-0 px-3 py-2 rounded-xl bg-black/30 border border-[#C8A45D]/30 text-[#D7C08E] hover:text-white"
                          title="Limpar filtro por dia"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-[#B49A73]">
                      {selectedReportDay
                        ? `Dia selecionado: ${formatDateBr(selectedReportDay)}`
                        : `Período atual: ${formatDateBr(dataInicio)} a ${formatDateBr(dataFim)}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SERVIÇOS SECTION ── */}
            <div className="rounded-2xl border border-[#C8A45D]/25 overflow-hidden bg-[#0c0502]/90 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              {/* Section header */}
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-[#150804]/80 border-b border-[#C8A45D]/20">
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#D7C08E] uppercase tracking-widest font-bold">
                  <Scissors className="w-4 h-4 text-[#C8A45D]" />
                  Serviços Realizados
                </div>
                <span className="text-[10px] font-mono bg-[#C8A45D]/15 text-[#F1DEB5] px-2.5 py-1 rounded-lg border border-[#C8A45D]/30 font-bold">
                  {funcRegs.length} registro{funcRegs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {funcRegs.length === 0 ? (
                <div className="py-12 text-center text-[#B49A73] font-mono text-xs">
                  <Scissors className="w-8 h-8 mx-auto mb-3 text-[#C8A45D]/30" />
                  Nenhum serviço registrado no período.
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className={`hidden md:block overflow-x-auto custom-scrollbar ${funcRegs.length > 10 ? 'max-h-[520px] overflow-y-auto custom-scrollbar' : ''}`}>
                    <table className="w-full text-left text-xs text-white">
                      <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${funcRegs.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
                        <tr>
                          <th className="py-3 px-4">Data / Hora</th>
                          {selectedVendedorId === 'ALL' && <th className="py-3 px-4">Profissional</th>}
                          <th className="py-3 px-4">Serviço</th>
                          <th className="py-3 px-4 text-center">Qtd</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-right">Comissão</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C8A45D]/10 font-mono">
                        {funcRegs.map((r) => {
                          const serv = servicos.find(s => s.id === r.servicoId);
                          const vend = users.find(u => u.id === r.vendedorId);
                          return (
                            <tr key={r.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                              <td className="py-3 px-4 text-[#B49A73] whitespace-nowrap">
                                {new Date(r.dataHora).toLocaleDateString('pt-BR')}{' '}
                                <span className="text-[#B49A73]/60">{new Date(r.dataHora).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
                              </td>
                              {selectedVendedorId === 'ALL' && <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{vend?.name || '-'}</td>}
                              <td className="py-3 px-4 text-white font-semibold whitespace-nowrap">{serv?.name || '-'}</td>
                              
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded bg-[#C8A45D]/15 border border-[#C8A45D]/30 text-[#F1DEB5] font-bold">{r.quantidade || 1}×</span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-white">{formatCurrency(r.valorCobrado)}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="text-[#F1DEB5] font-bold">{formatCurrency(r.valorComissao)}</div>
                                <div className="text-[9px] text-[#B49A73]">{serv?.commissionPercent}% de comissão</div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${statusClass(r.status)}`}>{r.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile rows (horizontal line format) */}
                  <div className={`md:hidden ${funcRegs.length > 10 ? 'max-h-[520px] overflow-y-auto custom-scrollbar' : ''}`}>
                    <div className="divide-y divide-[#C8A45D]/10">
                      {funcRegs.map((r) => {
                        const serv = servicos.find(s => s.id === r.servicoId);
                        const vend = users.find(u => u.id === r.vendedorId);
                        return (
                          <div key={r.id} className="py-2 px-2 hover:bg-[#C8A45D]/5 transition-colors text-white">
                            <div className="flex items-center gap-1 w-full min-w-0 text-[10px]">
                              <div className="flex-shrink-0 w-[88px] text-[#B49A73]/80 font-mono whitespace-nowrap">
                                {new Date(r.dataHora).toLocaleDateString('pt-BR').slice(0,5)} {new Date(r.dataHora).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}
                              </div>
                              <div className="flex-shrink-0 w-[6px]"></div>
                              {selectedVendedorId === 'ALL' && (
                                <>
                                  <div className="flex-shrink-0 font-bold text-[10px] text-[#F1DEB5] w-[72px] truncate">{vend?.name || '-'}</div>
                                  <div className="flex-shrink-0 w-[5px]"></div>
                                </>
                              )}
                              <div className="flex-shrink-0 text-[#E8D6B5]/85 w-[62px] truncate">{serv?.name || 'Serviço'}</div>
                              <div className="flex-shrink-0 w-[5px]"></div>
                              <div className="flex-shrink-0 font-mono font-bold text-[#F1DEB5] w-[28px] text-center">{r.quantidade || 1}×</div>
                              <div className="flex-shrink-0 w-[5px]"></div>
                              <div className="flex-shrink-0 font-mono font-bold w-[62px] text-right">{formatCurrency(r.valorCobrado)}</div>
                              <div className="flex-shrink-0 w-[5px]"></div>
                              <div className="flex-shrink-0 font-mono font-bold text-emerald-300 w-[62px] text-right">{formatCurrency(r.valorComissao)}</div>
                              <div className="flex-shrink-0 ml-auto">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border flex-shrink-0 ${statusClass(r.status)}`}>{r.status === 'APROVADO' ? 'APV' : r.status === 'PENDENTE' ? 'PEN' : r.status === 'PAGO' ? 'PGO' : 'REP'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── VALES SECTION ── */}
            <div className="rounded-2xl border border-fuchsia-500/25 overflow-hidden bg-[#0c0512]/90 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              {/* Section header */}
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-[#10061a]/80 border-b border-fuchsia-500/20">
                <div className="flex items-center gap-2 text-[11px] font-mono text-fuchsia-300 uppercase tracking-widest font-bold">
                  <CreditCard className="w-4 h-4 text-fuchsia-400" />
                  Vales Solicitados
                </div>
                <span className="text-[10px] font-mono bg-fuchsia-500/15 text-fuchsia-200 px-2.5 py-1 rounded-lg border border-fuchsia-500/30 font-bold">
                  {funcVales.length} vale{funcVales.length !== 1 ? 's' : ''}
                </span>
              </div>

              {funcVales.length === 0 ? (
                <div className="py-12 text-center text-fuchsia-300/50 font-mono text-xs">
                  <CreditCard className="w-8 h-8 mx-auto mb-3 text-fuchsia-500/30" />
                  Nenhum vale solicitado no período.
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className={`hidden md:block overflow-x-auto custom-scrollbar ${funcVales.length > 10 ? 'max-h-[520px] overflow-y-auto custom-scrollbar' : ''}`}>
                    <table className="w-full text-left text-xs text-white">
                      <thead className={`bg-[#180612] text-fuchsia-300 font-mono border-b border-fuchsia-500/20 uppercase ${funcVales.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
                        <tr>
                          <th className="py-3 px-4">Data / Hora</th>
                          {selectedVendedorId === 'ALL' && <th className="py-3 px-4">Profissional</th>}
                          <th className="py-3 px-4 text-right">Valor</th>
                          <th className="py-3 px-4">Motivo</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-fuchsia-500/10 font-mono">
                        {funcVales.map((v) => {
                          const vend = users.find(u => u.id === v.vendedorId);
                          return (
                            <tr key={v.id} className="hover:bg-fuchsia-500/5 transition-colors">
                              <td className="py-3 px-4 text-[#B49A73] whitespace-nowrap">
                                {new Date(v.dataSolicitacao).toLocaleDateString('pt-BR')}{' '}
                                <span className="text-[#B49A73]/60">{new Date(v.dataSolicitacao).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
                              </td>
                              {selectedVendedorId === 'ALL' && <td className="py-3 px-4 font-bold text-white">{vend?.name || '-'}</td>}
                              <td className="py-3 px-4 text-right font-bold text-fuchsia-200 text-sm">{formatCurrency(v.valor)}</td>
                              <td className="py-3 px-4 text-[#E8D6B5]/70 max-w-xs truncate">{v.motivo}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${statusClass(v.status)}`}>{v.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile rows (horizontal line format) */}
                  <div className={`md:hidden ${funcVales.length > 10 ? 'max-h-[520px] overflow-y-auto custom-scrollbar' : ''}`}>
                    <div className="divide-y divide-fuchsia-500/10">
                      {funcVales.map((v) => {
                        const vend = users.find(u => u.id === v.vendedorId);
                        return (
                          <div key={v.id} className="py-2 px-2 hover:bg-fuchsia-500/5 transition-colors text-white">
                            <div className="flex items-center gap-1 w-full min-w-0 text-[10px]">
                              <div className="flex-shrink-0 w-[88px] text-[#B49A73]/80 font-mono whitespace-nowrap">
                                {new Date(v.dataSolicitacao).toLocaleDateString('pt-BR').slice(0,5)} {new Date(v.dataSolicitacao).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}
                              </div>
                              <div className="flex-shrink-0 w-[6px]"></div>
                              {selectedVendedorId === 'ALL' && (
                                <>
                                  <div className="flex-shrink-0 font-bold text-[10px] text-[#F1DEB5] w-[72px] truncate">{vend?.name || '-'}</div>
                                  <div className="flex-shrink-0 w-[5px]"></div>
                                </>
                              )}
                              <div className="flex-shrink-0 font-mono font-bold text-fuchsia-200 w-[70px] text-right">{formatCurrency(v.valor)}</div>
                              <div className="flex-shrink-0 w-[5px]"></div>
                              <div className="flex-shrink-0 text-[#E8D6B5]/80 truncate flex-1">{v.motivo}</div>
                              <div className="flex-shrink-0 ml-auto">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border flex-shrink-0 ${statusClass(v.status)}`}>{v.status === 'APROVADO' ? 'APV' : v.status === 'PENDENTE' ? 'PEN' : v.status === 'PAGO' ? 'PGO' : v.status === 'DESCONTADO' ? 'DSC' : 'REP'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        );
      }
      default: return null;
    }
  };

  const handleExportCSV = () => {
    const filename = selectedReportDay
      ? `relatorio_${reportType.toLowerCase()}_${selectedReportDay}`
      : `relatorio_${reportType.toLowerCase()}_${dataInicio}_a_${dataFim}`;

    const headers = ['Funcionário', 'Email', 'Filial', 'Qtd Atendimentos', 'Total Produzido (R$)', 'Comissao Bruta (R$)', 'Vales Descontados (R$)', 'Saldo Liquido (R$)'];
    const rows = reportSellers.map(v => {
        const vRegs = filteredRegistros.filter(r => r.vendedorId === v.id);
        const totalVendido = vRegs.reduce((sum, r) => sum + r.valorCobrado, 0);
        const totalComissao = vRegs.reduce((sum, r) => sum + r.valorComissao, 0);
        const vVales = filteredVales.filter(vl => vl.vendedorId === v.id && (vl.status === 'APROVADO' || vl.status === 'DESCONTADO'));
        const totalVales = vVales.reduce((sum, vl) => sum + vl.valor, 0);
        const filial = filiais.find(f => f.id === v.filialId);
        return [
          v.name,
          v.email,
          filial?.name || '',
          vRegs.length,
          totalVendido.toFixed(2),
          totalComissao.toFixed(2),
          totalVales.toFixed(2),
          Math.max(0, totalComissao - totalVales).toFixed(2)
        ];
    });
    exportToCSV(filename, headers, rows);
  };

  const handlePrintReport = () => {
    const activeConfig = StorageService.getConfig();
    const salonName = activeConfig.salonNetworkName || 'Bom Corte Salões';
    const slogan = activeConfig.slogan || 'Rede de Alta Performance & Gestão de Salões';
    const filialLabel = selectedFilialId === 'ALL' ? 'Toda a Rede' : (filiais.find(f => f.id === selectedFilialId)?.name || 'Filial Selecionada');
    const periodoLabel = selectedReportDay
      ? formatDateBr(selectedReportDay)
      : `${formatDateBr(dataInicio)} a ${formatDateBr(dataFim)}`;

    let reportTitle = 'Relatório de Produção e Comissões por Funcionário';
    const rowsHtml = reportSellers.map(v => {
      const vRegs = filteredRegistros.filter(r => r.vendedorId === v.id);
      const totalVendido = vRegs.reduce((sum, r) => sum + r.valorCobrado, 0);
      const totalComissao = vRegs.reduce((sum, r) => sum + r.valorComissao, 0);
      const vVales = filteredVales.filter(vl => vl.vendedorId === v.id && (vl.status === 'APROVADO' || vl.status === 'DESCONTADO'));
      const totalVales = vVales.reduce((sum, vl) => sum + vl.valor, 0);
      const filial = filiais.find(f => f.id === v.filialId);
      const saldoLiquido = Math.max(0, totalComissao - totalVales);

      return `
        <tr>
          <td><strong>${v.name}</strong></td>
          <td>${filial?.name || '-'}</td>
          <td style="text-align:center;">${vRegs.length}</td>
          <td class="money">${formatCurrency(totalVendido)}</td>
          <td class="money">${formatCurrency(totalComissao)}</td>
          <td class="money" style="color:#b91c1c;">- ${formatCurrency(totalVales)}</td>
          <td class="money" style="color:#047857; font-weight:bold;">${formatCurrency(saldoLiquido)}</td>
        </tr>
      `;
    }).join('');

    const reportHtml = `
      <h2 style="font-size:18px; margin-top:0; color:#111827;">${reportTitle}</h2>
      <div class="summary-box">
        <div style="font-weight:bold; margin-bottom:6px; color:#c2410c;">PARÂMETROS DE EMISSÃO</div>
        <div><strong>Filial:</strong> ${filialLabel} | <strong>Período:</strong> ${periodoLabel} | <strong>Emitido por:</strong> ${currentUser.name}</div>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th>Funcionário</th>
            <th>Filial</th>
            <th style="text-align:center;">Atendimentos</th>
            <th class="money">Total Produzido</th>
            <th class="money">Comissão Bruta</th>
            <th class="money">Vales Desc.</th>
            <th class="money">Saldo Líquido</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    printStyledReport(reportHtml, reportTitle, {
      salonName,
      slogan,
      filialName: selectedFilialId !== 'ALL' ? filiais.find(f => f.id === selectedFilialId)?.name : undefined
    });
  };

  return (
    <div className="space-y-6">
      





      {/* Main Report Table */}
      <div className="rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        {renderReportContent()}
      </div>

    </div>
  );
};

