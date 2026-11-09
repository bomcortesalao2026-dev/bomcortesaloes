import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Edit3, 
  Scissors, 
  User as UserIcon, 
  Building2, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  History,
  CheckCircle2,
  Layers,
  Plus,
  Minus,
  Lock
} from 'lucide-react';
import { RegistroServico, User, Servico, Filial } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RegistroServico | null;
  currentUser: User;
  onSaved: () => void;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onSaved,
}) => {
  if (!isOpen || !record) return null;

  const users = StorageService.getUsers();
  const filiais = StorageService.getFiliais();
  const servicos = StorageService.getServicos();

  const vendedor = users.find(u => u.id === record.vendedorId);
  const filial = filiais.find(f => f.id === record.filialId);
  const servico = servicos.find(s => s.id === record.servicoId);

  const [quantidade, setQuantidade] = useState<number | string>(record.quantidade || 1);
  const [valorUnitario, setValorUnitario] = useState<number | string>(
    record.valorUnitario || (record.valorCobrado / (record.quantidade || 1))
  );
  const [valorCobrado, setValorCobrado] = useState<number>(record.valorCobrado);
  const [commissionPercent, setCommissionPercent] = useState<number | string>(record.commissionPercent || 0);
  const [motivoEdicao, setMotivoEdicao] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const isBlocked = record.status === 'PAGO' || record.status === 'REPROVADO';

  // Sync state when record changes
  useEffect(() => {
    if (record) {
      const q = record.quantidade || 1;
      const unit = record.valorUnitario || (record.valorCobrado / q);
      setQuantidade(q);
      setValorUnitario(Number(unit.toFixed(2)));
      setValorCobrado(record.valorCobrado);
      setCommissionPercent(record.commissionPercent || 0);
      setMotivoEdicao('');
      setError('');
      setSuccess(false);
    }
  }, [record]);

  // Handle quantity change
  const handleQuantityChange = (val: string | number) => {
    if (val === '') {
      setQuantidade('');
      return;
    }
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num)) return;
    setQuantidade(Math.max(1, num));
  };

  // Calculated values
  const safeQ = typeof quantidade === 'number' ? quantidade : (parseInt(quantidade) || 0);
  const safeU = typeof valorUnitario === 'number' ? valorUnitario : (parseFloat(valorUnitario) || 0);
  const safeC = typeof commissionPercent === 'number' ? commissionPercent : (parseFloat(commissionPercent) || 0);

  const calculatedBrutoTotal = Number((safeQ * safeU).toFixed(2));
  const calculatedComissao = Number(((calculatedBrutoTotal * safeC) / 100).toFixed(2));
  const calculatedSalao = Number((calculatedBrutoTotal - calculatedComissao).toFixed(2));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isBlocked) {
      setError(`Atendimentos com status ${record.status} não podem ser alterados.`);
      return;
    }

    if (safeQ <= 0) {
      setError('A quantidade de serviços deve ser de no mínimo 1.');
      return;
    }

    if (calculatedBrutoTotal < 0) {
      setError('O valor cobrado não pode ser negativo.');
      return;
    }

    if (!motivoEdicao.trim()) {
      setError('Informe uma justificativa para a alteração da quantidade e/ou valor.');
      return;
    }

    const updated = StorageService.updateRegistroServicoDetalhes(
      record.id,
      {
        quantidade: safeQ,
        valorUnitario: safeU,
        valorCobrado: calculatedBrutoTotal,
        commissionPercent: safeC,
        motivoEdicao: motivoEdicao.trim(),
      },
      currentUser
    );

    if (updated) {
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } else {
      setError('Erro ao salvar as alterações do atendimento.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#0B1B2B] border-2 border-[#C8A45D]/60 shadow-[0_0_50px_rgba(255,90,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-5 border-b border-[#C8A45D]/20 flex items-center justify-between bg-gradient-to-r from-[#122B41] to-[#0B1B2B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C8A45D] to-[#872300] flex items-center justify-center border border-[#D8B56B] shadow-[0_0_15px_rgba(255,90,0,0.6)]">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#D7C08E] uppercase tracking-widest">
                // GESTÃO OPERACIONAL
              </div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Alterar Quantidade & Valor do Serviço
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#D7C08E] hover:text-white hover:bg-[#0C1F31]/90/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs custom-scrollbar">
          
          {isBlocked && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/70 text-amber-200 flex items-center gap-2.5 font-mono text-[11px]">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Edição Bloqueada:</strong> Este atendimento possui status <strong>{record.status}</strong> e não pode ter a quantidade ou o valor alterados.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Atendimento atualizado com sucesso! Recalculando...</span>
            </div>
          )}

          {/* Service Summary Card */}
          <div className="p-3.5 rounded-2xl bg-[#10283D] border border-[#C8A45D]/30 grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono">
            <div>
              <span className="text-[10px] text-[#D7C08E] block">SERVIÇO</span>
              <span className="text-white font-bold truncate block">{servico?.name || 'Serviço'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#D7C08E] block">FUNCIONÁRIO</span>
              <span className="text-white font-bold truncate block">{vendedor?.name || 'Funcionário'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#D7C08E] block">FILIAL</span>
              <span className="text-white font-bold truncate block">{filial?.name || 'Filial'}</span>
            </div>
          </div>

          {/* Interactive Edit Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            
            {/* 1. Quantidade de Serviços */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-[#C8A45D]/30 space-y-2">
              <label className="text-[11px] font-mono text-[#D7C08E] uppercase font-bold flex items-center justify-between">
                <span>Quantidade Realizada:</span>
                <span className="text-white bg-[#C8A45D]/20 px-2 py-0.5 rounded border border-[#C8A45D]/40">
                  {quantidade}x
                </span>
              </label>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(safeQ - 1)}
                  disabled={isBlocked || safeQ <= 1}
                  className="w-9 h-9 rounded-xl bg-[#16344C] border border-[#C8A45D]/40 flex items-center justify-center text-white hover:bg-[#C8A45D] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={quantidade}
                  disabled={isBlocked}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-center font-bold text-base text-white rounded-xl py-1.5 outline-none focus:border-[#D8B56B] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(safeQ + 1)}
                  disabled={isBlocked}
                  className="w-9 h-9 rounded-xl bg-[#16344C] border border-[#C8A45D]/40 flex items-center justify-center text-white hover:bg-[#C8A45D] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* 2. Valor Unitário */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-[#C8A45D]/30 space-y-2">
              <label className="text-[11px] font-mono text-[#D7C08E] uppercase font-bold flex items-center justify-between">
                <span>Valor do Serviço (Unitário):</span>
                <span className="text-emerald-400 font-mono">
                  {formatCurrency(valorUnitario)}
                </span>
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B] font-mono font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorUnitario}
                  disabled={isBlocked}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setValorUnitario(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-[#10283D] border border-[#C8A45D]/40 pl-9 pr-3 py-2 text-white font-mono font-bold text-sm rounded-xl outline-none focus:border-[#D8B56B] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>


            </div>

            {/* 3. Comissão */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-[#C8A45D]/30 space-y-2">
              <label className="text-[11px] font-mono text-[#D7C08E] uppercase font-bold flex items-center justify-between">
                <span>Comissão (%):</span>
                <span className="text-[#F1DEB5] font-mono">
                  {commissionPercent}%
                </span>
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B] font-mono font-bold">%</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={commissionPercent}
                  disabled={isBlocked}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCommissionPercent(e.target.value === '' ? '' : Math.max(0, Math.min(100, parseInt(e.target.value))))}
                  className="w-full bg-[#10283D] border border-[#C8A45D]/40 pl-9 pr-3 py-2 text-white font-mono font-bold text-sm rounded-xl outline-none focus:border-[#D8B56B] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#E8D6B5]/80">
                <span>Valor Base:</span>
                <span className="text-white">{servico?.commissionPercent}%</span>
              </div>
            </div>

          </div>

          {/* Real-time Recalculation Impact Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1B3D57]/80 via-[#1a0803]/80 to-[#0e0402]/80 backdrop-blur-md border border-[#C8A45D]/40 shadow-[0_0_25px_rgba(255,90,0,0.15)]">
            <div className="text-[12px] sm:text-xs font-mono text-[#D7C08E] uppercase font-bold mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C8A45D]" />
              <span>Impacto Financeiro em Tempo Real</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-mono">
              <div className="p-3 sm:p-2.5 rounded-xl bg-black/40 border border-[#C8A45D]/30 shadow-inner backdrop-blur-sm">
                <span className="text-xs sm:text-[10px] text-[#D7C08E] block mb-1">BRUTO TOTAL</span>
                <span className="text-lg sm:text-base font-bold text-white">{formatCurrency(calculatedBrutoTotal)}</span>
              </div>
              <div className="p-3 sm:p-2.5 rounded-xl bg-black/40 border border-[#C8A45D]/30 shadow-inner backdrop-blur-sm">
                <span className="text-xs sm:text-[10px] text-[#F1DEB5] block mb-1">COMISSÃO ({commissionPercent}%)</span>
                <span className="text-lg sm:text-base font-bold text-emerald-400">{formatCurrency(calculatedComissao)}</span>
              </div>
              <div className="p-3 sm:p-2.5 rounded-xl bg-black/40 border border-[#C8A45D]/30 shadow-inner backdrop-blur-sm">
                <span className="text-xs sm:text-[10px] text-[#E8D6B5] block mb-1">PARTE DO SALÃO</span>
                <span className="text-lg sm:text-base font-bold text-cyan-400">{formatCurrency(calculatedSalao)}</span>
              </div>
            </div>
          </div>

          {/* Reason for Editing (Mandatory for Audit) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-mono text-[#D7C08E] uppercase font-bold mb-1">
              Justificativa / Motivo da Alteração * (Obrigatório para Auditoria)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['Quantidade Errada', 'Valor Errado', 'Comissão Errada'].map((motivo) => (
                <button
                  type="button"
                  key={motivo}
                  disabled={isBlocked}
                  onClick={() => {
                    if (motivoEdicao.includes(motivo)) {
                      setMotivoEdicao(motivoEdicao.replace(motivo, '').replace(/,\s*,/g, ',').replace(/^,\s*|\s*,$/g, '').trim());
                    } else {
                      setMotivoEdicao(motivoEdicao ? `${motivoEdicao}, ${motivo}` : motivo);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold transition-all border cursor-pointer ${
                    motivoEdicao.includes(motivo)
                      ? 'bg-gradient-to-r from-[#C8A45D]/30 to-[#9F7B2E]/30 border-[#C8A45D] text-[#F1DEB5] shadow-[0_0_10px_rgba(200,164,93,0.3)]'
                      : 'bg-[#10283D]/80 border-[#C8A45D]/30 text-white/70 hover:text-white hover:border-[#D8B56B]/60'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {motivo}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={motivoEdicao}
              disabled={isBlocked}
              onChange={(e) => setMotivoEdicao(e.target.value)}
              placeholder="Descreva o motivo detalhado ou selecione as opções rápidas acima..."
              required={!isBlocked}
              className="w-full bg-[#10283D] border border-[#C8A45D]/40 px-3 py-2 text-white rounded-xl outline-none focus:border-[#D8B56B] placeholder-[#B49A73]/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            />
          </div>

          {/* Edit History if exists */}
          {record.editHistory && record.editHistory.length > 0 && (
            <div className="p-3 rounded-2xl bg-black/50 border border-[#C8A45D]/20 space-y-1.5">
              <div className="text-[10px] font-mono text-[#D7C08E] uppercase flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#C8A45D]" />
                <span>Histórico de Modificações Anteriores ({record.editHistory.length})</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] font-mono text-[#E8D6B5]/80 custom-scrollbar">
                {record.editHistory.map((h: any, i) => {
                  const dateStr = h.date || h.editadoEm;
                  const dateObj = dateStr ? new Date(dateStr) : null;
                  const validDate = dateObj && !isNaN(dateObj.getTime()) ? dateObj : new Date();
                  
                  return (
                  <div key={i} className="p-1.5 rounded bg-[#10283D] border border-[#C8A45D]/15">
                    <span className="text-[#D7C08E]">
                      {validDate.toLocaleDateString('pt-BR')} {validDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span> por <strong className="text-white">{h.userName || h.editadoPorNome || 'Desconhecido'}</strong>: {h.reason || (h.camposAlterados ? `Alterou ${h.camposAlterados.join(', ')}` : 'Sem justificativa')}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#C8A45D]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-black/40 border border-[#C8A45D]/30 text-[#E8D6B5] hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isBlocked}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] hover:brightness-110 text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.5)] transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isBlocked ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isBlocked ? 'Alteração Bloqueada' : 'Salvar Alterações'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
