import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  AlertCircle, 
  HelpCircle,
  FileText,
  Calendar,
  Sparkles,
  Lock,
  Building2,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Vale, User, Filial } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency, printStyledReport } from '../utils/exportUtils';

interface VendedorValesModuleProps {
  currentUser: User;
}

export const VendedorValesModule: React.FC<VendedorValesModuleProps> = ({ currentUser }) => {
  const [vales, setVales] = useState<Vale[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [valorSolicitado, setValorSolicitado] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [selectedFilialId, setSelectedFilialId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isRefreshingV, setIsRefreshingV] = useState<boolean>(false);
  const [lastRefreshV, setLastRefreshV] = useState<string>('');

  const refreshData = () => {
    const allVales = StorageService.getVales().filter(v => v.vendedorId === currentUser.id);
    setVales(allVales);
    const fList = StorageService.getFiliais();
    setFiliais(fList);
    if (currentUser.filialId) {
      setSelectedFilialId(currentUser.filialId);
    } else if (fList.length > 0) {
      setSelectedFilialId(fList[0].id);
    }
  };

  const forceRefreshV = async () => {
    if (isRefreshingV) return;
    setIsRefreshingV(true);
    try {
      await StorageService.refreshForScreen('EMPLOYEE');
    } catch {}
    refreshData();
    setLastRefreshV(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setTimeout(() => setIsRefreshingV(false), 400);
  };

  useEffect(() => {
    refreshData();
    setLastRefreshV(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') forceRefreshV();
    };
    forceRefreshV();
    document.addEventListener('visibilitychange', refreshOnReturn);

    return () => {
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [currentUser]);

  // Calculate available approved commission balance
  const approvedCommissions = StorageService.getRegistrosServicos()
    .filter(r => r.vendedorId === currentUser.id && r.status === 'APROVADO')
    .reduce((sum, r) => sum + r.valorComissao, 0);

  // Inclui TODOS os vales ativos (PENDENTE, APROVADO e DESCONTADO) para refletir o saldo real
  const totalValesAtivos = vales
    .filter(v => v.status === 'PENDENTE' || v.status === 'APROVADO' || v.status === 'DESCONTADO')
    .reduce((sum, v) => sum + v.valor, 0);

  // Saldo real (pode ser negativo)
  const saldoRealDisponivel = approvedCommissions - totalValesAtivos;
  // Para exibição no campo de limite (não permite negativo na UI de solicitação)
  const saldoDisponivelParaVale = Math.max(0, saldoRealDisponivel);

  const handleRequestVale = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const val = parseFloat(valorSolicitado) || 0;
    if (val <= 0) {
      setErrorMsg('Informe um valor de adiantamento válido.');
      return;
    }

    if (!motivo.trim()) {
      setErrorMsg('Informe a justificativa ou motivo do adiantamento.');
      return;
    }

    const agoraISO = new Date().toISOString();
    const novoVale: Vale = {
      id: 'vale-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      vendedorId: currentUser.id,
      filialId: selectedFilialId || currentUser.filialId || 'filial-1',
      valor: val,
      valorSolicitado: val,
      motivo: motivo.trim(),
      dataSolicitacao: agoraISO,
      data: agoraISO.slice(0, 10),
      status: 'PENDENTE',
      createdAt: agoraISO,
    };

    const salvo = StorageService.addVale(novoVale);
    
    StorageService.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Solicitação de Vale',
      registroTipo: 'VALE',
      registroId: salvo.id,
      registroDescricao: `Solicitação de R$ ${val.toFixed(2)}`,
      detalhes: motivo.trim(),
    });

    setValorSolicitado('');
    setMotivo('');
    setSuccessMsg(`Solicitação de vale no valor de ${formatCurrency(val)} enviada para a gerência/administração.`);

    try {
      confetti({
        particleCount: 50,
        spread: 50,
        colors: ['#C8A45D', '#ffffff', '#D8B56B']
      });
    } catch {}

    refreshData();
  };

  const handlePrintVale = (vale: Vale) => {
    printStyledReport(`
      <h2>Comprovante de Solicitação de Vale / Adiantamento</h2>
      <p><strong>Profissional:</strong> ${currentUser.name}</p>
      <p><strong>Valor Solicitado:</strong> ${formatCurrency(vale.valor)}</p>
      <p><strong>Data da Solicitação:</strong> ${new Date(vale.dataSolicitacao).toLocaleString('pt-BR')}</p>
      <p><strong>Status:</strong> ${vale.status}</p>
      <p><strong>Motivo / Justificativa:</strong> ${vale.motivo}</p>
      ${vale.justificativaReprovacao ? `<p><strong>Obs da Gerência:</strong> ${vale.justificativaReprovacao}</p>` : ''}
      <hr style="margin-top: 40px; border: 1px dashed #ccc;" />
      <p style="margin-top: 40px; text-align: center;">____________________________________________<br/>Assinatura do Profissional</p>
    `, `Vale_${vale.id}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#D7C08E] mb-1">
          <CreditCard className="w-4 h-4 text-[#C8A45D]" />
          <span>ADIANTAMENTO SALARIAL // CONTROLE DE VALES</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">
          Vales & Adiantamentos do Profissional
        </h2>
        <p className="text-xs text-[#B49A73] mt-0.5">
          Solicite adiantamentos de comissão para aprovação da sua filial e consulte o histórico de débitos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* REQUEST VALE FORM */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/40 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-4">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-[#C8A45D]/20 pb-3">
            <Plus className="w-4 h-4 text-[#C8A45D]" />
            Nova Solicitação de Vale
          </h3>

          {/* Balance card */}
          <div className={`p-3 rounded-xl text-xs font-mono border ${
            saldoRealDisponivel < 0
              ? 'bg-gradient-to-br from-rose-950/80 to-[#120202] border-rose-500/70'
              : 'bg-gradient-to-br from-[#17364F] to-[#0B1C2C] border-[#D9B76C]'
          }`}>
            <div className="text-[10px] text-[#D7C08E] uppercase">Comissões Aprovadas Disponíveis:</div>
            <div className={`text-xl font-black mt-0.5 ${
              saldoRealDisponivel < 0 ? 'text-rose-400' : 'text-white'
            }`}>{formatCurrency(approvedCommissions)}</div>
            <div className="text-[10px] text-[#B49A73] mt-1">
              Saldo livre estimado:{' '}
              <strong className={saldoRealDisponivel < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {formatCurrency(saldoRealDisponivel)}
              </strong>
            </div>
            {saldoRealDisponivel < 0 && (
              <div className="mt-1.5 text-[10px] text-rose-300 flex items-center gap-1">
                <span>⚠️</span>
                <span>Saldo negativo: vales superam suas comissões atuais.</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRequestVale} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#D7C08E] font-mono mb-1 flex items-center justify-between">
                <span>Filial Vinculada</span>
                <span className="text-[10px] text-[#E2C98A] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#D8B56B]" /> Fixa
                </span>
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs">
                <Building2 className="w-4 h-4 text-[#D8B56B] shrink-0" />
                <span className="truncate font-semibold text-[#E8D6B5]">
                  {filiais.find(f => f.id === selectedFilialId)?.name || 'Sua Filial'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[#D7C08E] font-mono mb-1">Valor do Vale (R$) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={valorSolicitado}
                  onChange={(e) => setValorSolicitado(e.target.value)}
                  placeholder="ex: 150.00"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white font-mono font-bold text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#D7C08E] font-mono mb-1">Motivo / Justificativa *</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="ex: Adiantamento para despesas pessoais / transporte"
                rows={3}
                required
                className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Enviar Solicitação de Vale
            </button>
          </form>
        </div>

        {/* VALES HISTORY LIST */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
          <div className="p-4 border-b border-[#C8A45D]/20 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C8A45D]" />
              Histórico de Vales Solicitados
            </h3>
            <span className="text-xs text-[#B49A73] font-mono">{vales.length} registros</span>
          </div>

          <div className={`overflow-x-auto custom-scrollbar ${vales.length > 10 ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
            <table className="w-full text-left text-xs text-white">
              <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${vales.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8A45D]/10">
                {vales.map((v) => (
                  <tr key={v.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-[#B49A73]">
                      {new Date(v.dataSolicitacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-mono text-white font-bold text-sm">
                      {formatCurrency(v.valor)}
                    </td>
                    <td className="py-3 px-4 text-[#E8D6B5]/80 max-w-xs truncate">
                      {v.motivo}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        v.status === 'APROVADO'
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                          : v.status === 'PENDENTE'
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-400'
                          : v.status === 'DESCONTADO'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                          : 'bg-rose-950/40 border-rose-500/50 text-rose-400'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handlePrintVale(v)}
                        className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                        title="Imprimir Vale"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {vales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#B49A73] font-mono">
                      Nenhum vale solicitado até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
