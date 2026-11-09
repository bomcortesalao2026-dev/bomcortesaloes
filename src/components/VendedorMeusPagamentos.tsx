import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Download, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Eye,
  DollarSign,
  X,
  RefreshCw
} from 'lucide-react';
import { PagamentoSemanal, User, Filial } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency, printStyledReport, formatDate } from '../utils/exportUtils';

interface VendedorMeusPagamentosProps {
  currentUser: User;
}

export const VendedorMeusPagamentos: React.FC<VendedorMeusPagamentosProps> = ({ currentUser }) => {
  const [pagamentos, setPagamentos] = useState<PagamentoSemanal[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [selectedPagamento, setSelectedPagamento] = useState<PagamentoSemanal | null>(null);

  const refreshData = () => {
    const allPags = StorageService.getPagamentos().filter(p => p.vendedorId === currentUser.id);
    setPagamentos(allPags);
    setFiliais(StorageService.getFiliais());
  };


  const totalPagoAcumulado = pagamentos.reduce((sum, p) => sum + (p.valorLiquidoPago || 0), 0);
  const totalValesDescontados = pagamentos.reduce((sum, p) => sum + (p.totalValesDescontados || 0), 0);
  const totalComissaoBruta = pagamentos.reduce((sum, p) => sum + (p.totalComissaoBruta || 0), 0);

  const handlePrintReceipt = (p: PagamentoSemanal) => {
    const filial = filiais.find(f => f.id === p.filialId);
    const currentConfig = StorageService.getConfig();
    const salonName = currentConfig.salonNetworkName || 'Bom Corte Salões';
    const slogan = currentConfig.slogan || 'Rede de Alta Performance & Gestão de Salões';

    printStyledReport(`
      <h2 style="margin-top:0; color:#111827; font-size:18px;">Recibo de Pagamento Semanal de Comissões</h2>
      <div style="background:#FCF9F1; border:1px solid #fed7aa; padding:12px 16px; border-radius:8px; margin-bottom:16px; font-size:12px;">
        <div style="font-weight:bold; color:#c2410c; margin-bottom:4px;">DADOS DA LIQUIDAÇÃO</div>
        <p style="margin:2px 0;"><strong>Salão / Filial:</strong> ${filial?.name || salonName}</p>
        <p style="margin:2px 0;"><strong>Profissional:</strong> ${currentUser.name} (${currentUser.email})</p>
        <p style="margin:2px 0;"><strong>Período Pago:</strong> ${formatDate(p.periodoInicio)} até ${formatDate(p.dataPagamento)}</p>
        <p style="margin:2px 0;"><strong>Data do Pagamento:</strong> ${new Date(p.dataPagamento).toLocaleDateString('pt-BR')}</p>
        <p style="margin:2px 0;"><strong>Forma de Pagamento:</strong> ${p.formaPagamento}</p>
      </div>
      <table class="report-table">
        <tr>
          <th>Total Bruto de Comissões (${p.servicosIds.length} serviços):</th>
          <td class="money"><strong>${formatCurrency(p.totalComissaoBruta)}</strong></td>
        </tr>
        <tr>
          <th>Desconto de Vales / Adiantamentos (${p.valesIds.length} vales):</th>
          <td class="money" style="color: #b91c1c;"><strong>- ${formatCurrency(p.totalValesDescontados)}</strong></td>
        </tr>
        <tr style="font-size: 15px; background-color: #f0fdf4;">
          <th>VALOR LÍQUIDO PAGO:</th>
          <td class="money"><strong style="color: #047857;">${formatCurrency(p.valorLiquidoPago)}</strong></td>
        </tr>
      </table>
      ${p.observacoes ? `<p style="font-size:12px; margin-top:10px;"><strong>Observações:</strong> ${p.observacoes}</p>` : ''}
      <div style="margin-top: 50px; display: flex; justify-content: space-between; text-align: center; font-size: 11px;">
        <div>
          ________________________________________<br/>
          Assinatura do Profissional (${currentUser.name})
        </div>
        <div>
          ________________________________________<br/>
          Gerência / Administração (${salonName})
        </div>
      </div>
    `, `Recibo_Pagamento_${currentUser.name}`, {
      salonName,
      slogan,
      filialName: filial?.name
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#D7C08E] mb-1">
          <CreditCard className="w-4 h-4 text-[#C8A45D]" />
          <span>EXTRATO FINANCEIRO // HISTÓRICO DE REPASSES</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">
          Meus Pagamentos Semanais
        </h2>
        <p className="text-xs text-[#B49A73] mt-0.5">
          Consulte os fechamentos semanais já processados e imprima seus comprovantes de repasse.
        </p>
      </div>

      {/* Grid / Table of Weekly Payments */}
      <div className="rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className={`overflow-x-auto custom-scrollbar ${pagamentos.length > 10 ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
          <table className="w-full text-left text-xs text-white">
            <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${pagamentos.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
              <tr>
                <th className="py-3 px-4">Data Pagamento</th>
                <th className="py-3 px-4">Período de Apuração</th>
                <th className="py-3 px-4">Comissão Bruta</th>
                <th className="py-3 px-4">Vales Descontados</th>
                <th className="py-3 px-4">Valor Líquido Pago</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8A45D]/10">
              {pagamentos.map((p) => (
                <tr key={p.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                  <td className="py-3 px-4 font-mono text-[#B49A73]">
                    {new Date(p.dataPagamento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 font-mono text-white">
                    {formatDate(p.periodoInicio)} - {formatDate(p.dataPagamento)}
                  </td>
                  <td className="py-3 px-4 font-mono text-white">
                    {formatCurrency(p.totalComissaoBruta)}
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-400">
                    - {formatCurrency(p.totalValesDescontados)}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-bold text-sm">
                    {formatCurrency(p.valorLiquidoPago)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#E8D6B5]/80">
                    {p.formaPagamento}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 border border-emerald-500/50 text-emerald-400">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedPagamento(p)}
                        className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handlePrintReceipt(p)}
                        className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                        title="Imprimir Recibo"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pagamentos.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-[#B49A73] font-mono">
                    Nenhum pagamento semanal registrado até o momento.
                  </td>
                </tr>
              )}
              {pagamentos.length > 0 && (
                <tr className="bg-[#16344C]/50 border-t-2 border-[#C8A45D]/40">
                  <td colSpan={2} className="py-4 px-4 font-mono font-bold text-[#E8D6B5] text-right uppercase">
                    Total Acumulado:
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-white">
                    {formatCurrency(totalComissaoBruta)}
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-rose-400">
                    - {formatCurrency(totalValesDescontados)}
                  </td>
                  <td className="py-4 px-4 font-mono font-black text-emerald-400 text-base">
                    {formatCurrency(totalPagoAcumulado)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedPagamento && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C8A45D]" />
                Detalhes do Fechamento
              </h3>
              <button onClick={() => setSelectedPagamento(null)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Período Pago:</span>
                  <span className="text-white font-bold">{formatDate(selectedPagamento.periodoInicio)} a {formatDate(selectedPagamento.dataPagamento)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Data Liquidação:</span>
                  <span className="text-white">{new Date(selectedPagamento.dataPagamento).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Método:</span>
                  <span className="text-white">{selectedPagamento.formaPagamento}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Comissão Bruta ({selectedPagamento.servicosIds.length} serviços):</span>
                  <span className="text-white font-bold">{formatCurrency(selectedPagamento.totalComissaoBruta)}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>(-) Vales / Adiantamentos:</span>
                  <span className="font-bold">- {formatCurrency(selectedPagamento.totalValesDescontados)}</span>
                </div>
                <div className="pt-2 border-t border-[#C8A45D]/20 flex justify-between text-emerald-400 text-sm">
                  <span className="font-bold">TOTAL LÍQUIDO PAGO:</span>
                  <span className="font-black text-base">{formatCurrency(selectedPagamento.valorLiquidoPago)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#C8A45D]/20 flex justify-between items-center">
              <button
                onClick={() => handlePrintReceipt(selectedPagamento)}
                className="px-3.5 py-2 rounded-xl bg-black/40 border border-[#C8A45D]/30 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-[#C8A45D]" />
                <span>Imprimir Comprovante</span>
              </button>
              <button
                onClick={() => setSelectedPagamento(null)}
                className="px-4 py-2 rounded-xl bg-[#C8A45D] text-black font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
