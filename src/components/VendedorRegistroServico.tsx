import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Building2, 
  Calendar, 
  User, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  Hash, 
  Plus, 
  Minus, 
  Edit3, 
  Check, 
  RotateCcw,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User as UserType, Filial, Servico, RegistroServico } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';

interface VendedorRegistroServicoProps {
  currentUser: UserType;
  onSuccessNavigate?: () => void;
  negativeMode?: boolean;
}

export const VendedorRegistroServico: React.FC<VendedorRegistroServicoProps> = ({ 
  currentUser,
  onSuccessNavigate,
  negativeMode = false,
}) => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [saldoDevedorAtual, setSaldoDevedorAtual] = useState<number>(0);
  const [ultimoAbatimento, setUltimoAbatimento] = useState<number>(0);

  // Form states
  const [selectedFilialId, setSelectedFilialId] = useState<string>('');
  const [selectedServicoId, setSelectedServicoId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<string>(''); // Left blank initially as requested
  const [valorUnitario, setValorUnitario] = useState<string>(''); // Left blank initially as requested
  const [dataHora, setDataHora] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Confirmation Screen / Modal state
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  
  // Editable fields inside confirmation modal
  const [modalQuantidade, setModalQuantidade] = useState<string>('1');
  const [modalValorUnitario, setModalValorUnitario] = useState<string>('');

  const [submittedRecord, setSubmittedRecord] = useState<RegistroServico | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const fList = StorageService.getFiliais();
    // Filter active services and match strictly with user's function
    const sList = StorageService.getServicos().filter(s => {
      const isActive = s.status === 'ATIVO';
      const matchesFuncao = !currentUser.funcaoId || !s.funcaoId || s.funcaoId === currentUser.funcaoId;
      return isActive && matchesFuncao;
    });
    setFiliais(fList);

    // Auto set default filial for user
    if (currentUser.filialId && !selectedFilialId) {
      setSelectedFilialId(currentUser.filialId);
    } else if (fList.length > 0 && !selectedFilialId) {
      setSelectedFilialId(fList[0].id);
    }

    setServicos(prev => {
      if (sList.length > 0 && !selectedServicoId) {
        setSelectedServicoId(sList[0].id);
      }
      return sList;
    });
  }, [currentUser.id, currentUser.funcaoId, currentUser.filialId]);

  useEffect(() => {
    setSaldoDevedorAtual(StorageService.getSaldoNegativoDevedor(currentUser.id));
  }, [currentUser.id]);

  // When selected service changes, we leave the price field as the user typed (blank by default)
  const handleServiceChange = (sId: string) => {
    setSelectedServicoId(sId);
  };

  const currentServico = servicos.find(s => s.id === selectedServicoId);
  const currentFilial = filiais.find(f => f.id === selectedFilialId);

  // Live Calculations for Main Form
  const parsedPrice = parseFloat(valorUnitario) || 0;
  const safeQty = Math.max(1, parseInt(quantidade) || 1);
  const totalCobrado = Number((parsedPrice * safeQty).toFixed(2));
  const commissionPercent = currentServico ? currentServico.commissionPercent : 0;
  const calculatedCommission = Number(((totalCobrado * commissionPercent) / 100).toFixed(2));
  const calculatedSalao = Number((totalCobrado - calculatedCommission).toFixed(2));
  const previewAbatimentoForm = negativeMode || saldoDevedorAtual > 0 ? Math.min(calculatedCommission, saldoDevedorAtual) : 0;

  // Live Calculations for Confirmation Screen
  const parsedModalPrice = parseFloat(modalValorUnitario) || 0;
  const safeModalQty = Math.max(1, parseInt(modalQuantidade) || 1);
  const modalTotalCobrado = Number((parsedModalPrice * safeModalQty).toFixed(2));
  const modalCommission = Number(((modalTotalCobrado * commissionPercent) / 100).toFixed(2));
  const modalSalao = Number((modalTotalCobrado - modalCommission).toFixed(2));
  const previewAbatimentoModal = negativeMode || saldoDevedorAtual > 0 ? Math.min(modalCommission, saldoDevedorAtual) : 0;

  // Step 1: Open Confirmation Screen
  const handleReviewStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedServicoId) {
      setErrorMsg('Selecione o serviço realizado.');
      return;
    }
    if (!selectedFilialId) {
      setErrorMsg('Selecione a filial do atendimento.');
      return;
    }
    if (parsedPrice <= 0) {
      setErrorMsg('Digite o valor unitário cobrado pelo serviço.');
      return;
    }

    // Set modal editable state from form
    setModalQuantidade(quantidade || '1');
    setModalValorUnitario(valorUnitario);
    setIsConfirming(true);
  };

  // Step 2: Final Confirmation
  const handleFinalSubmit = async () => {
    if (isSaving) return;
    setErrorMsg('');

    if (parsedModalPrice <= 0) {
      setErrorMsg('O valor do serviço deve ser maior que zero.');
      return;
    }
    if (safeModalQty <= 0) {
      setErrorMsg('A quantidade deve ser de pelo menos 1 atendimento.');
      return;
    }

    let dataHoraISO = new Date().toISOString();
    if (dataHora) {
      const parsed = new Date(dataHora);
      if (!isNaN(parsed.getTime())) {
        dataHoraISO = parsed.toISOString();
      }
    }

    const pct = currentServico ? currentServico.commissionPercent : 0;
    const vComissao = modalCommission;
    const vSalao = modalSalao;

    const novoRegistro: RegistroServico = {
      id: 'reg-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      filialId: selectedFilialId,
      vendedorId: currentUser.id,
      servicoId: selectedServicoId,
      quantidade: safeModalQty,
      valorUnitario: parsedModalPrice,
      valorCobrado: modalTotalCobrado,
      commissionPercent: pct,
      valorComissao: vComissao,
      valorSalao: vSalao,
      dataHora: dataHoraISO,
      status: 'PENDENTE',
      observacoes: '',
      createdAt: dataHoraISO,
    };

    setIsSaving(true);
    let newRecord: RegistroServico;
    try {
      newRecord = await StorageService.addRegistro(novoRegistro);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Falha ao gravar o atendimento no banco de dados. Tente novamente.');
      setIsSaving(false);
      return;
    }
    setIsSaving(false);

    StorageService.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Novo Atendimento (Lançamento)',
      registroTipo: 'REGISTRO_SERVICO',
      registroId: newRecord.id,
      registroDescricao: `${currentServico?.name || 'Serviço'} - R$ ${newRecord.valorCobrado.toFixed(2)}`,
      detalhes: `Qtd: ${safeModalQty} | Vl Unit: R$ ${parsedModalPrice.toFixed(2)} | Comissão ${pct}%: R$ ${vComissao.toFixed(2)} | Salão: R$ ${vSalao.toFixed(2)}`,
    });

    let valorAbatido = 0;
    if (negativeMode || saldoDevedorAtual > 0) {
      valorAbatido = StorageService.abaterSaldoNegativo(currentUser.id, vComissao, newRecord.id, currentUser);
    }
    setUltimoAbatimento(valorAbatido);
    setSaldoDevedorAtual(StorageService.getSaldoNegativoDevedor(currentUser.id));

    setIsConfirming(false);

    // Fire cyber celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C8A45D', '#E2C98A', '#ffffff', '#D9B76C']
      });
    } catch {
      // ignore
    }

    if (onSuccessNavigate) {
      setTimeout(() => onSuccessNavigate(), 400);
    } else {
      setSubmittedRecord(newRecord);
    }
  };

  const handleResetForNew = () => {
    setSubmittedRecord(null);
    setIsConfirming(false);
    setQuantidade('');
    setValorUnitario('');
    if (servicos.length > 0) {
      setSelectedServicoId(servicos[0].id);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {(negativeMode || saldoDevedorAtual > 0) && (
        <div className="p-4 rounded-2xl bg-rose-950/50 border-2 border-rose-600/60 shadow-[0_0_30px_rgba(220,38,38,0.25)] space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-black text-rose-200 uppercase tracking-wider">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>⚠ MODO QUITAÇÃO DE SALDO NEGATIVO</span>
          </div>
          <p className="text-xs text-rose-200/90">
            Você está com saldo devedor de <strong className="text-rose-100">{formatCurrency(saldoDevedorAtual)}</strong>.
            A comissão de cada atendimento será usada para quitar este valor até completar o pagamento.
          </p>
          <div className="pt-1 text-[10px] font-mono text-rose-200/80">
            Próximo abate estimado desta tela: <strong className="text-rose-100">{formatCurrency(previewAbatimentoForm)}</strong>
            {previewAbatimentoForm > 0 && saldoDevedorAtual > 0 && (
              <span> — após abate restam {formatCurrency(Math.max(0, saldoDevedorAtual - previewAbatimentoForm))}</span>
            )}
          </div>
        </div>
      )}

      {/* Title & Guidance */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#D7C08E] mb-1">
          <Scissors className="w-4 h-4 text-[#C8A45D]" />
          <span>PAINEL DO PROFISSIONAL // ATENDIMENTO RÁPIDO</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">
          Registro de Serviço Realizado
        </h2>
        <p className="text-xs text-[#B49A73] mt-0.5">
          Informe a quantidade e o valor cobrado. Em seguida, revise tudo na tela de confirmação.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUCCESS CONFIRMATION STATE */}
      {submittedRecord ? (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1d0a03] to-[#0d0502] border-2 border-[#D9B76C] shadow-[0_0_50px_rgba(255,90,0,0.3)] text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#C8A45D] text-black font-bold flex items-center justify-center mx-auto shadow-[0_0_25px_#C8A45D]">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mt-3">Atendimento Registrado com Sucesso!</h3>
            <p className="text-xs text-[#E8D6B5]/80 mt-1 max-w-md mx-auto">
              O serviço foi registrado e já está visível na sua lista de atendimentos.
            </p>
          </div>

          {/* Breakdown summary */}
          <div className="p-4 rounded-2xl bg-black/60 border border-[#C8A45D]/30 max-w-md mx-auto text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#B49A73]">Serviço:</span>
              <span className="text-white font-bold">{currentServico?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B49A73]">Quantidade Realizada:</span>
              <span className="text-white font-bold">{submittedRecord.quantidade || 1} atendimento(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B49A73]">Valor Unitário:</span>
              <span className="text-white font-mono">{formatCurrency(submittedRecord.valorUnitario || (submittedRecord.valorCobrado / (submittedRecord.quantidade || 1)))}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#C8A45D]/20">
              <span className="text-[#B49A73]">Valor Total Cobrado:</span>
              <span className="text-white font-bold text-sm">{formatCurrency(submittedRecord.valorCobrado)}</span>
            </div>
            <div className="flex justify-between text-[#F1DEB5]">
              <span>Sua Comissão ({submittedRecord.commissionPercent}%):</span>
              <span className="font-bold text-base">{formatCurrency(submittedRecord.valorComissao)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Destinado ao Salão:</span>
              <span>{formatCurrency(submittedRecord.valorSalao)}</span>
            </div>
            {ultimoAbatimento > 0 && (
              <>
                <div className="pt-1 mt-1 border-t border-rose-500/30" />
                <div className="flex justify-between text-rose-300">
                  <span>🔻 Abatido Saldo Negativo:</span>
                  <span className="font-black text-rose-200">- {formatCurrency(ultimoAbatimento)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-rose-300/80">
                  <span>Saldo devedor atual:</span>
                  <span className="font-bold text-rose-100">
                    {saldoDevedorAtual <= 0.01 ? '✅ QUITADO!' : formatCurrency(saldoDevedorAtual)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleResetForNew}
              className="px-5 py-2.5 rounded-xl bg-black/40 border border-[#C8A45D]/30 text-white text-xs font-bold hover:border-[#D8B56B] transition-all cursor-pointer"
            >
              + Registrar Outro Serviço
            </button>
            {onSuccessNavigate && (
              <button
                onClick={onSuccessNavigate}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white text-xs font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Ver Meus Serviços</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* MAIN SERVICE ENTRY FORM */
        <form onSubmit={handleReviewStep} className="p-6 rounded-3xl bg-[#0B1B2B]/95 border border-[#C8A45D]/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Filial Fixa do Profissional */}
            <div>
              <label className="block text-xs font-mono text-[#D7C08E] mb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>1. Filial Vinculada</span>
                <span className="text-[10px] text-[#E2C98A] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#D8B56B]" /> Fixa do seu cadastro
                </span>
              </label>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs">
                <Building2 className="w-4 h-4 text-[#D8B56B] shrink-0" />
                <span className="truncate font-semibold text-[#E8D6B5]">
                  {currentFilial?.name || 'Sua Filial Vinculada'}
                </span>
              </div>
            </div>

            {/* Serviço */}
            <div>
              <label className="block text-xs font-mono text-[#D7C08E] mb-1.5 uppercase tracking-wider">
                2. Serviço Realizado *
              </label>
              <div className="relative">
                <Scissors className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                <select
                  id="registro-servico-select"
                  value={selectedServicoId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-[#D9B76C]"
                >
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Comissão: {s.commissionPercent}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Quantidade Realizada */}
            <div>
              <label className="block text-xs font-mono text-[#D7C08E] mb-1.5 uppercase tracking-wider">
                3. Quantidade de Serviços *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const currentQ = parseInt(quantidade) || 1;
                    setQuantidade(Math.max(1, currentQ - 1).toString());
                  }}
                  className="w-10 h-10 rounded-xl bg-[#10283D] border border-[#C8A45D]/40 text-[#D7C08E] hover:text-white hover:border-[#D9B76C] flex items-center justify-center text-base font-bold transition-all active:scale-95 cursor-pointer"
                  title="Diminuir quantidade"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                  <input
                    id="registro-quantidade-input"
                    type="number"
                    min="1"
                    step="1"
                    value={quantidade}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="1"
                    className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-white text-sm font-mono font-bold text-center rounded-xl pl-8 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentQ = parseInt(quantidade) || 1;
                    setQuantidade((currentQ + 1).toString());
                  }}
                  className="w-10 h-10 rounded-xl bg-[#10283D] border border-[#C8A45D]/40 text-[#D7C08E] hover:text-white hover:border-[#D9B76C] flex items-center justify-center text-base font-bold transition-all active:scale-95 cursor-pointer"
                  title="Aumentar quantidade"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-[#B49A73] mt-1">
                * Quantidade de vezes que o procedimento foi realizado.
              </p>
            </div>

            {/* Valor do Serviço (Digitável, sem texto Sugerido e em branco) */}
            <div>
              <label className="block text-xs font-mono text-[#D7C08E] mb-1.5 uppercase tracking-wider">
                4. Valor do Serviço (R$) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                <input
                  id="registro-valor-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valorUnitario}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-white text-sm font-mono font-bold rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/40"
                />
              </div>
              <p className="text-[10px] text-[#B49A73] mt-1">
                * Digite o valor unitário cobrado por atendimento.
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Data e Horário */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-[#D7C08E] mb-1.5 uppercase tracking-wider">
                5. Data e Horário do Atendimento
              </label>
              <div className="relative max-w-md">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                <input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-[#D9B76C]"
                />
              </div>
            </div>

          </div>

          {/* DYNAMIC COMMISSION PREVIEW BOX */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#17364F] via-[#150702] to-[#0c0401] border-2 border-[#D9B76C] shadow-[0_0_30px_rgba(255,90,0,0.2)] space-y-3">
            <div className="flex items-center justify-between border-b border-[#C8A45D]/30 pb-2">
              <span className="font-mono text-xs font-bold text-[#E2C98A] flex items-center gap-1.5 uppercase">
                <Sparkles className="w-4 h-4 text-[#C8A45D]" />
                Prévia do Atendimento & Comissão
              </span>
              <span className="text-[10px] font-mono text-amber-300">
                {safeQty}x {formatCurrency(parsedPrice)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-black/50 border border-[#C8A45D]/20">
                <div className="text-[10px] text-[#B49A73]">Serviço:</div>
                <div className="font-bold text-white truncate">{currentServico?.name || '-'}</div>
                <div className="text-[10px] text-[#D7C08E] mt-0.5">Comissão fixa: {commissionPercent}%</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-[#C8A45D]/20">
                <div className="text-[10px] text-[#B49A73]">Total Cobrado:</div>
                <div className="font-bold text-white text-sm">{formatCurrency(totalCobrado)}</div>
                <div className="text-[10px] text-[#D7C08E] mt-0.5">{safeQty}x de {formatCurrency(parsedPrice)}</div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[#C8A45D]/15 border border-[#D9B76C]">
                <div className="text-[10px] text-[#D7C08E] uppercase font-bold">Sua Comissão ({commissionPercent}%):</div>
                <div className="font-black text-[#F1DEB5] text-base">{formatCurrency(calculatedCommission)}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Salão: {formatCurrency(calculatedSalao)}</div>
              </div>
            </div>

            {(negativeMode || saldoDevedorAtual > 0) && previewAbatimentoForm > 0 && (
              <div className="pt-3 mt-1 border-t border-rose-500/30 space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-300 flex items-center gap-1.5">
                    🔻 Abatimento Saldo Negativo:
                  </span>
                  <span className="font-black text-rose-200">- {formatCurrency(previewAbatimentoForm)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-rose-300/80">Saldo restante após abate:</span>
                  <span className="font-bold text-rose-100">
                    {formatCurrency(Math.max(0, saldoDevedorAtual - previewAbatimentoForm))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button to Open Confirmation Screen */}
          <button
            type="submit"
            id="btn-submit-service-record"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#C8A45D] via-[#D9B76C] to-[#9F7B2E] text-white font-black text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(255,90,0,0.5)] hover:shadow-[0_0_40px_rgba(255,90,0,0.8)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Revisar Atendimento & Confirmar</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      )}

      {/* TELA DE CONFIRMAÇÃO (MODAL COM POSSIBILIDADE DE ALTERAR VALOR E QUANTIDADE) */}
      {isConfirming && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0B1B2B] border-2 border-[#D9B76C] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(255,90,0,0.3)] text-xs relative overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Ambient Background Energy */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#C8A45D]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#C8A45D]/30 mb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D7C08E] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8A45D]" />
                  ETAPA DE CONFIRMAÇÃO
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Confirmar Lançamento do Atendimento
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-[#C8A45D]/20 text-[#D7C08E] border border-[#C8A45D]/40">
                <Edit3 className="w-4 h-4 text-[#C8A45D]" />
              </div>
            </div>

            <p className="text-xs text-[#E8D6B5]/80 mb-4">
              Confira os dados abaixo. Se houver alguma divergência, você pode alterar a <strong className="text-white font-bold">quantidade</strong> e o <strong className="text-white font-bold">valor do serviço</strong> diretamente nesta tela antes de finalizar.
            </p>

            {/* Interactive Edit Section inside Confirmation */}
            <div className="p-4 rounded-2xl bg-black/60 border border-[#C8A45D]/30 space-y-4 mb-4 font-mono">
              
              {/* Service Info */}
              <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/15">
                <span className="text-[#B49A73] text-xs">Serviço:</span>
                <span className="text-white font-bold text-sm">{currentServico?.name}</span>
              </div>

              {/* Editable Quantity */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[#B49A73] text-xs block">Quantidade Realizada:</span>
                  <span className="text-[10px] text-[#D7C08E]">Ajuste se necessário</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const currentQ = parseInt(modalQuantidade) || 1;
                      setModalQuantidade(Math.max(1, currentQ - 1).toString());
                    }}
                    className="w-8 h-8 rounded-lg bg-[#10283D] border border-[#C8A45D]/40 text-white hover:border-[#D9B76C] flex items-center justify-center font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={modalQuantidade}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setModalQuantidade(e.target.value)}
                    placeholder="1"
                    className="w-14 bg-[#10283D] border border-[#C8A45D]/50 text-white font-bold text-center rounded-lg py-1 outline-none focus:border-[#D9B76C] text-sm placeholder-[#B49A73]/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const currentQ = parseInt(modalQuantidade) || 1;
                      setModalQuantidade((currentQ + 1).toString());
                    }}
                    className="w-8 h-8 rounded-lg bg-[#10283D] border border-[#C8A45D]/40 text-white hover:border-[#D9B76C] flex items-center justify-center font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Editable Service Price */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[#B49A73] text-xs block">Valor por Serviço (R$):</span>
                  <span className="text-[10px] text-[#D7C08E]">Edite o valor unitário</span>
                </div>
                <div className="relative w-32">
                  <DollarSign className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={modalValorUnitario}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setModalValorUnitario(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#10283D] border border-[#C8A45D]/50 text-white font-bold rounded-lg pl-7 pr-2 py-1 outline-none focus:border-[#D9B76C] text-sm text-right placeholder-[#B49A73]/50"
                  />
                </div>
              </div>

              {/* Filial info */}
              <div className="pt-2 border-t border-[#C8A45D]/15 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Filial:</span>
                  <span className="text-white">{currentFilial?.name}</span>
                </div>
              </div>

            </div>

            {/* Calculated Values Summary */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#200b02] to-[#120601] border border-[#D9B76C] mb-5 space-y-2 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#D7C08E]">Valor Total Cobrado ({safeModalQty}x):</span>
                <span className="text-base font-bold text-white">{formatCurrency(modalTotalCobrado)}</span>
              </div>
              <div className="flex justify-between items-center text-[#F1DEB5]">
                <span className="text-xs font-semibold">Sua Comissão Prevista ({commissionPercent}%):</span>
                <span className="text-lg font-black">{formatCurrency(modalCommission)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 text-xs pt-1 border-t border-[#C8A45D]/20">
                <span>Repasse Destinado ao Salão:</span>
                <span>{formatCurrency(modalSalao)}</span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#C8A45D]/20">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2.5 rounded-xl bg-black/50 border border-[#C8A45D]/30 text-[#E8D6B5] hover:text-white hover:border-[#D8B56B] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#B49A73]" />
                <span>Voltar / Corrigir</span>
              </button>

              <button
                type="button"
                id="btn-confirm-final-service"
                onClick={handleFinalSubmit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_20px_rgba(255,90,0,0.5)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Salvando no banco...' : 'Confirmar & Finalizar'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
