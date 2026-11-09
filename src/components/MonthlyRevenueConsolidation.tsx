import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Wallet, 
  Building2, 
  Download, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  PieChart as PieIcon,
  CheckCircle2
} from 'lucide-react';
import { Filial, RegistroServico, PagamentoSemanal, User } from '../types';
import { formatCurrency, printStyledReport, exportToCsv } from '../utils/exportUtils';

interface MonthlyRevenueConsolidationProps {
  filiais: Filial[];
  registros: RegistroServico[];
  pagamentos: PagamentoSemanal[];
  users: User[];
  currentUser: User;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthlyRevenueConsolidation: React.FC<MonthlyRevenueConsolidationProps> = ({
  filiais,
  registros,
  pagamentos,
  users,
  currentUser
}) => {
  const isGerente = currentUser.role === 'GERENTE';
  const managerFilialId = currentUser.filialId || '';
  const currentFilial = filiais.find(f => f.id === (isGerente ? managerFilialId : (filiais[0]?.id || '')));

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-11
  const [selectedFilialId, setSelectedFilialId] = useState<string>(isGerente ? managerFilialId : 'ALL');

  // Active filiais scoped by permissions
  const scopedFiliais = useMemo(() => {
    if (isGerente) {
      return filiais.filter(f => f.id === managerFilialId);
    }
    return filiais;
  }, [filiais, isGerente, managerFilialId]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Compute records for selected month
  const monthData = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0).getTime();
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

    // Active filial target
    const activeTargetFilialId = isGerente ? managerFilialId : selectedFilialId;

    // Filter services that occurred in this month
    const validRegistros = registros.filter(r => {
      if (r.status !== 'APROVADO' && r.status !== 'PAGO') return false;
      if (activeTargetFilialId && activeTargetFilialId !== 'ALL' && r.filialId !== activeTargetFilialId) return false;
      const t = new Date(r.dataHora).getTime();
      return t >= start && t <= end;
    });

    // Total Services Count
    const totalServicos = validRegistros.reduce((sum, r) => sum + (r.quantidade || 1), 0);

    // Total Gross Revenue
    const faturamentoBruto = validRegistros.reduce((sum, r) => sum + r.valorCobrado, 0);

    // Total Commissions Generated for Stylists
    const comissoesPagas = validRegistros.reduce((sum, r) => sum + r.valorComissao, 0);

    // Total Net Salon Revenue (Bruto - Comissões)
    const faturamentoLiquido = Math.max(0, faturamentoBruto - comissoesPagas);

    // Percentages
    const comissaoPercent = faturamentoBruto > 0 ? (comissoesPagas / faturamentoBruto) * 100 : 0;
    const liquidoPercent = faturamentoBruto > 0 ? (faturamentoLiquido / faturamentoBruto) * 100 : 0;

    // Filial Breakdown
    const filiaisBreakdown = scopedFiliais
      .filter(f => activeTargetFilialId === 'ALL' || f.id === activeTargetFilialId)
      .map(f => {
        const fRegs = validRegistros.filter(r => r.filialId === f.id);
        const fBruto = fRegs.reduce((sum, r) => sum + r.valorCobrado, 0);
        const fComissao = fRegs.reduce((sum, r) => sum + r.valorComissao, 0);
        const fLiquido = Math.max(0, fBruto - fComissao);
        const fCount = fRegs.reduce((sum, r) => sum + (r.quantidade || 1), 0);

        return {
          filial: f,
          servicosCount: fCount,
          bruto: fBruto,
          comissoes: fComissao,
          liquido: fLiquido,
          sharePercent: faturamentoBruto > 0 ? (fBruto / faturamentoBruto) * 100 : (isGerente ? 100 : 0)
        };
      });

    return {
      totalServicos,
      faturamentoBruto,
      comissoesPagas,
      faturamentoLiquido,
      comissaoPercent,
      liquidoPercent,
      filiaisBreakdown,
      validRegistros
    };
  }, [registros, scopedFiliais, selectedYear, selectedMonth, selectedFilialId, isGerente, managerFilialId]);

  const monthLabel = `${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;

  const handleExportCSV = () => {
    const data = monthData.filiaisBreakdown.map(item => ({
      Mês: monthLabel,
      Filial: item.filial.name,
      'Cidade / UF': `${item.filial.city}/${item.filial.state}`,
      'Qtd Atendimentos': item.servicosCount,
      'Faturamento Bruto (R$)': item.bruto.toFixed(2),
      'Comissões Pagas (R$)': item.comissoes.toFixed(2),
      'Faturamento Líquido (R$)': item.liquido.toFixed(2),
      'Participação (%)': `${item.sharePercent.toFixed(1)}%`
    }));

    exportToCsv(data, `fechamento_mensal_${selectedYear}_${selectedMonth + 1}`);
  };

  const handlePrintPDF = () => {
    printStyledReport(`
      <h2>Consolidado de Faturamento Mensal — Rede</h2>
      <p><strong>Mês de Referência:</strong> ${monthLabel}</p>
      <p><strong>Filtro:</strong> ${selectedFilialId === 'ALL' ? 'Todas as Filiais da Rede' : filiais.find(f => f.id === selectedFilialId)?.name}</p>
      <hr style="margin: 20px 0; border: 1px solid #ddd;" />
      
      <table class="report-table">
        <tr>
          <th>Faturamento Total Bruto:</th>
          <td><strong>${formatCurrency(monthData.faturamentoBruto)}</strong></td>
        </tr>
        <tr>
          <th>Total de Comissões Pagas à Equipe:</th>
          <td style="color: #c00;"><strong>- ${formatCurrency(monthData.comissoesPagas)} (${monthData.comissaoPercent.toFixed(1)}%)</strong></td>
        </tr>
        <tr style="font-size: 16px; background-color: #f0fdf4;">
          <th>FATURAMENTO LÍQUIDO DO SALÃO:</th>
          <td><strong style="color: #047857;">${formatCurrency(monthData.faturamentoLiquido)} (${monthData.liquidoPercent.toFixed(1)}%)</strong></td>
        </tr>
        <tr>
          <th>Total de Atendimentos Realizados:</th>
          <td>${monthData.totalServicos} serviços</td>
        </tr>
      </table>

      <h3 style="margin-top: 30px;">Detalhamento por Unidade / Filial</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Filial</th>
            <th>Qtd. Serviços</th>
            <th>Faturamento Bruto</th>
            <th>Comissões</th>
            <th>Líquido Salão</th>
            <th>Participação</th>
          </tr>
        </thead>
        <tbody>
          ${monthData.filiaisBreakdown.map(f => `
            <tr>
              <td><strong>${f.filial.name}</strong></td>
              <td>${f.servicosCount}</td>
              <td>${formatCurrency(f.bruto)}</td>
              <td>${formatCurrency(f.comissoes)}</td>
              <td><strong>${formatCurrency(f.liquido)}</strong></td>
              <td>${f.sharePercent.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
        Relatório gerado em ${new Date().toLocaleString('pt-BR')} por ${currentUser.name} (${currentUser.role})
      </div>
    `, `Faturamento_Mensal_${selectedYear}_${selectedMonth + 1}`);
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0B1B2B]/95 border-2 border-[#C8A45D]/40 shadow-[0_10px_40px_rgba(0,0,0,0.8)] space-y-6">
      
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C8A45D]/20 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D7C08E] uppercase font-bold">
            <Sparkles className="w-4 h-4 text-[#C8A45D]" />
            <span>
              {isGerente ? `Fechamento Mensal // ${currentFilial?.name || 'Sua Filial'}` : 'Fechamento Mensal Consolidado da Rede'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase mt-0.5 flex items-center gap-2">
            <span>Faturamento Total do Mês</span>
            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#C8A45D]/20 border border-[#C8A45D]/40 text-[#F1DEB5] font-mono">
              {isGerente ? `📍 ${currentFilial?.name || 'Sua Filial'}` : (selectedFilialId === 'ALL' ? 'Todas as Filiais' : `📍 ${filiais.find(f => f.id === selectedFilialId)?.name || 'Filial Selecionada'}`)}
            </span>
          </h3>
        </div>

        {/* Month Navigation & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-[#10283D] border border-[#C8A45D]/40 rounded-xl p-1 font-mono text-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-[#D7C08E] hover:text-white hover:bg-[#0C1F31]/90/5 cursor-pointer transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold text-white whitespace-nowrap">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-[#D7C08E] hover:text-white hover:bg-[#0C1F31]/90/5 cursor-pointer transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isGerente && currentUser.role === 'ADMIN' && (
            <select
              value={selectedFilialId}
              onChange={(e) => setSelectedFilialId(e.target.value)}
              className="bg-[#10283D] border border-[#C8A45D]/40 text-white text-xs rounded-xl px-3 py-2 outline-none font-mono cursor-pointer"
            >
              <option value="ALL">🌐 Todas as Filiais ({filiais.length})</option>
              {filiais.map(f => (
                <option key={f.id} value={f.id}>📍 {f.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-black/40 border border-[#C8A45D]/30 hover:border-[#D9B76C] text-[#E8D6B5] hover:text-white transition-all cursor-pointer"
            title="Exportar dados do mês em CSV"
          >
            <Download className="w-4 h-4 text-[#D8B56B]" />
          </button>
          <button
            onClick={handlePrintPDF}
            className="p-2 rounded-xl bg-black/40 border border-[#C8A45D]/30 hover:border-[#D9B76C] text-[#E8D6B5] hover:text-white transition-all cursor-pointer"
            title="Imprimir Relatório Mensal em PDF"
          >
            <Printer className="w-4 h-4 text-[#D8B56B]" />
          </button>
        </div>
      </div>

      {/* 3 Large Monthly Cards: Bruto, Comissões e Líquido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Valor Bruto Total */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#16344C] to-[#0B1B2B] border-2 border-[#C8A45D]/50 shadow-[0_0_25px_rgba(255,90,0,0.2)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#D7C08E] mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">1. Faturamento Bruto</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
              {formatCurrency(monthData.faturamentoBruto)}
            </div>
          </div>
          <div className="text-[11px] text-[#E8D6B5]/80 font-mono mt-3 pt-2 border-t border-[#C8A45D]/15 flex items-center justify-between">
            <span>{monthData.totalServicos} atendimentos</span>
            <span className="text-[10px] bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
              100% Receita
            </span>
          </div>
        </div>

        {/* 2. Comissões Pagas à Equipe */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#122B41] to-[#0B1B2B] border-2 border-[#C8A45D]/40 shadow-[0_4px_25px_rgba(0,0,0,0.6)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#D7C08E] mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">2. Comissões Pagas (Equipe)</span>
              <div className="w-8 h-8 rounded-xl bg-[#C8A45D]/20 flex items-center justify-center text-[#F1DEB5]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#F1DEB5] font-mono mt-1">
              - {formatCurrency(monthData.comissoesPagas)}
            </div>
          </div>
          <div className="text-[11px] text-[#D7C08E] font-mono mt-3 pt-2 border-t border-[#C8A45D]/15 flex items-center justify-between">
            <span>Repassado aos profissionais</span>
            <span className="text-[10px] bg-[#C8A45D]/15 text-[#F1DEB5] px-2 py-0.5 rounded border border-[#C8A45D]/30 font-bold">
              {monthData.comissaoPercent.toFixed(1)}% do Bruto
            </span>
          </div>
        </div>

        {/* 3. Valor Líquido (Receita Salão) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#142D40] via-[#0B1B2B] to-[#0B1B2B] border-2 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-emerald-300 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">3. Valor Líquido (Salão)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono mt-1">
              {formatCurrency(monthData.faturamentoLiquido)}
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono mt-3 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
            <span>Bruto menos comissões</span>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/50 font-bold">
              {monthData.liquidoPercent.toFixed(1)}% Retenção
            </span>
          </div>
        </div>

      </div>

      {/* Breakdown by Filial Table */}
      <div className="space-y-3">
        <div className="text-xs font-mono text-[#D7C08E] uppercase flex items-center gap-2 font-bold">
          <Building2 className="w-4 h-4 text-[#C8A45D]" />
          <span>{isGerente ? `Faturamento e Comissões da Filial // ${monthLabel}` : `Faturamento e Comissões Detalhados por Filial // ${monthLabel}`}</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-[#C8A45D]/20">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase">
              <tr>
                <th className="py-3 px-4">Filial</th>
                <th className="py-3 px-4">Localização</th>
                <th className="py-3 px-4 text-center">Atendimentos</th>
                <th className="py-3 px-4">Faturamento Bruto</th>
                <th className="py-3 px-4">Comissões Equipe</th>
                <th className="py-3 px-4">Faturamento Líquido (Salão)</th>
                <th className="py-3 px-4 text-right">Participação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8A45D]/10 font-mono">
              {monthData.filiaisBreakdown.map((item) => (
                <tr key={item.filial.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C8A45D]" />
                    <span>{item.filial.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-[#E8D6B5]/80">
                    {item.filial.city}/{item.filial.state}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-[#C8A45D]/20">
                      {item.servicosCount}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {formatCurrency(item.bruto)}
                  </td>
                  <td className="py-3.5 px-4 text-[#F1DEB5]">
                    {formatCurrency(item.comissoes)}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold text-sm">
                    {formatCurrency(item.liquido)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                      {item.sharePercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}

              {monthData.filiaisBreakdown.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#B49A73]">
                    Nenhum atendimento faturado no mês de {monthLabel}.
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
