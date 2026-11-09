import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Save, 
  History, 
  Building2, 
  User as UserIcon, 
  Scissors, 
  DollarSign, 
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { RegistroServico, User, Filial, Servico } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';

interface PedidoNotificacaoModalProps {
  record: RegistroServico;
  currentUser: User;
  filiais: Filial[];
  users: User[];
  servicos: Servico[];
  onClose: () => void;
  onUpdated: () => void;
}

export const PedidoNotificacaoModal: React.FC<PedidoNotificacaoModalProps> = ({
  record,
  currentUser,
  filiais,
  users,
  servicos,
  onClose,
  onUpdated,
}) => {
  const [notificacaoText, setNotificacaoText] = useState<string>(record.notificacao || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const filial = filiais.find(f => f.id === record.filialId);
  const profissional = users.find(u => u.id === record.vendedorId);
  const servico = servicos.find(s => s.id === record.servicoId);
  const qty = record.quantidade || 1;

  const hasActiveNotification = Boolean(record.notificacao && record.notificacao.trim());
  const hasRejectionAlert = Boolean(record.motivoReprovacao || record.justificativaReprovacao);
  const hasObservations = Boolean(record.observacoes && record.observacoes.trim());
  const hasEditHistory = Boolean(record.editHistory && record.editHistory.length > 0);

  const handleSaveNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificacaoText.trim()) return;

    setIsSaving(true);
    StorageService.setNotificacaoRegistroServico(record.id, notificacaoText.trim(), currentUser);
    setIsSaving(false);
    setSuccessMsg('Notificação salva com sucesso!');
    setTimeout(() => {
      setSuccessMsg('');
      onUpdated();
    }, 800);
  };

  const handleRemoveNotification = () => {
    setIsSaving(true);
    StorageService.removerNotificacaoRegistroServico(record.id, currentUser);
    setNotificacaoText('');
    setIsSaving(false);
    setSuccessMsg('Notificação removida do pedido.');
    setTimeout(() => {
      setSuccessMsg('');
      onUpdated();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#120703] border-2 border-[#C8A45D]/60 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(255,90,0,0.25)] flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#C8A45D]/25">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C8A45D] to-[#b33600] flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,90,0,0.5)]">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              {(hasActiveNotification || hasRejectionAlert) && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-black"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                  Notificações do Atendimento
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  record.status === 'APROVADO'
                    ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-400'
                    : record.status === 'PENDENTE'
                    ? 'bg-amber-950/50 border-amber-500/60 text-amber-400'
                    : record.status === 'PAGO'
                    ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-400'
                    : 'bg-rose-950/50 border-rose-500/60 text-rose-400'
                }`}>
                  {record.status}
                </span>
              </div>
              <p className="text-xs text-[#B49A73] font-mono">
                ID: {record.id} • {new Date(record.dataHora).toLocaleDateString('pt-BR')} às {new Date(record.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#0C1F31]/90/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Details Briefing */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#10283D] border border-[#C8A45D]/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-mono text-[#B49A73] block uppercase">Filial:</span>
            <span className="font-bold text-white flex items-center gap-1 mt-0.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-[#C8A45D] shrink-0" />
              {filial?.name || 'Não informada'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-[#B49A73] block uppercase">Profissional:</span>
            <span className="font-bold text-white flex items-center gap-1 mt-0.5 truncate">
              <UserIcon className="w-3.5 h-3.5 text-[#C8A45D] shrink-0" />
              {profissional?.name || 'Não informado'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-[#B49A73] block uppercase">Serviço:</span>
            <span className="font-bold text-white flex items-center gap-1 mt-0.5 truncate">
              <Scissors className="w-3.5 h-3.5 text-[#C8A45D] shrink-0" />
              {servico?.name || 'Serviço'} ({qty}x)
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-[#B49A73] block uppercase">Total Cobrado:</span>
            <span className="font-bold text-white font-mono flex items-center gap-1 mt-0.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {formatCurrency(record.valorCobrado)}
            </span>
          </div>
        </div>

        {/* Dynamic Alerts / Existing Notifications */}
        <div className="mt-4 space-y-3">
          
          {/* Active Main Notification */}
          {hasActiveNotification && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-[#183950] to-amber-950/40 border-2 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    <Bell className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Notificação Ativa no Pedido
                      </span>
                      {record.notificacaoAutor && (
                        <span className="text-[10px] font-mono text-[#E8D6B5]/70">
                          por {record.notificacaoAutor}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white mt-1 leading-relaxed">
                      "{record.notificacao}"
                    </p>
                    {record.notificacaoData && (
                      <span className="text-[10px] font-mono text-[#B49A73] block mt-1.5">
                        Registrada em {new Date(record.notificacaoData).toLocaleDateString('pt-BR')} às {new Date(record.notificacaoData).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveNotification}
                  className="p-1.5 rounded-lg bg-black/40 text-rose-400 hover:bg-rose-950/50 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Limpar Notificação"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Rejection Alert */}
          {hasRejectionAlert && (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block">
                    Motivo da Reprovação
                  </span>
                  <p className="text-xs text-white mt-1 leading-relaxed">
                    {record.motivoReprovacao || record.justificativaReprovacao}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Observations */}
          {hasObservations && (
            <div className="p-3.5 rounded-2xl bg-[#0C2032] border border-[#C8A45D]/30 text-xs">
              <div className="flex items-center gap-1.5 text-[#D7C08E] font-bold mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-[#C8A45D]" />
                <span>Observações do Lançamento:</span>
              </div>
              <p className="text-[#E8D6B5]">{record.observacoes}</p>
            </div>
          )}

          {/* Edit History */}
          {hasEditHistory && (
            <div className="p-3.5 rounded-2xl bg-[#0C2032] border border-[#C8A45D]/30 space-y-2">
              <div className="flex items-center gap-1.5 text-[#D7C08E] font-bold text-xs">
                <History className="w-3.5 h-3.5 text-[#C8A45D]" />
                <span>Histórico de Alterações Operacionais ({record.editHistory?.length}):</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {record.editHistory?.map((hist, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-black/40 border border-[#C8A45D]/15 text-[11px] text-[#E8D6B5]">
                    <div className="flex items-center justify-between text-[#D7C08E] font-mono text-[10px]">
                      <span>{new Date(hist.date).toLocaleDateString('pt-BR')} às {new Date(hist.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Por: {hist.userName}</span>
                    </div>
                    <p className="mt-0.5 text-white font-medium">{hist.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasActiveNotification && !hasRejectionAlert && !hasObservations && !hasEditHistory && (
            <div className="p-6 text-center rounded-2xl bg-[#0C2032]/60 border border-[#C8A45D]/20 text-xs text-[#B49A73]">
              <Bell className="w-8 h-8 mx-auto mb-2 text-[#B49A73]/40" />
              <p className="text-white font-medium">Nenhuma notificação registrada neste atendimento ainda.</p>
              <p className="text-[11px] text-[#B49A73] mt-0.5">
                Você pode adicionar um aviso ou observação abaixo. O botão ficará piscando na tabela para chamar a atenção da equipe.
              </p>
            </div>
          )}
        </div>

        {/* Add / Edit Notification Form */}
        <form onSubmit={handleSaveNotification} className="mt-5 pt-4 border-t border-[#C8A45D]/25 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#D7C08E] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C8A45D]" />
              {hasActiveNotification ? 'Atualizar Notificação / Aviso' : 'Adicionar Notificação ao Pedido'}
            </label>
            <span className="text-[10px] font-mono text-[#B49A73]">
              Ativa o botão piscante na tabela
            </span>
          </div>

          <textarea
            value={notificacaoText}
            onChange={(e) => setNotificacaoText(e.target.value)}
            placeholder="Digite o aviso ou notificação para este atendimento (ex: 'Conferir comissão especial', 'Solicitante pediu agendamento de retorno', 'Comprovante em análise')..."
            rows={3}
            className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-white text-xs rounded-2xl p-3 outline-none focus:border-[#D8B56B] placeholder-[#B49A73]/50"
          />

          {successMsg && (
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white text-xs cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="submit"
              disabled={isSaving || !notificacaoText.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{hasActiveNotification ? 'Salvar Alteração' : 'Criar Notificação Piscante'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
