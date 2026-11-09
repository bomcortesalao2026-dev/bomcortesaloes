import React from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { calculateWeekCycle, WeekCycleInfo } from '../utils/dateCycleUtils';

interface WeekCycleBadgeProps {
  customRefDate?: Date;
  onOpenSettlement?: () => void;
}

export const WeekCycleBadge: React.FC<WeekCycleBadgeProps> = ({ customRefDate, onOpenSettlement }) => {
  const cycle: WeekCycleInfo = calculateWeekCycle(customRefDate || new Date());

  const getStatusDisplay = () => {
    if (cycle.status === 'FECHAMENTO_HOJE') {
      return {
        label: 'HOJE: DIA DE FECHAMENTO',
        sub: 'Pagamentos no final do expediente de sábado',
        bg: 'from-amber-950/90 via-[#1C3242] to-[#0B1D2D]',
        border: 'border-amber-500',
        textColor: 'text-amber-400',
        badgeBg: 'bg-amber-500 text-black',
        glow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
        pulse: true,
      };
    }
    if (cycle.status === 'FECHADO') {
      return {
        label: 'DOMINGO · SISTEMA DISPONÍVEL',
        sub: 'Acesso liberado; o próximo ciclo semanal começa na segunda-feira',
        bg: 'from-[#0C1C2B] via-[#0B1D2D] to-black',
        border: 'border-emerald-500/50',
        textColor: 'text-emerald-300',
        badgeBg: 'bg-emerald-500/20 text-emerald-200',
        glow: '',
        pulse: false,
      };
    }
    return {
      label: 'CICLO SEMANAL EM ANDAMENTO',
      sub: `Fechamento semanal: ${cycle.closingDateFormatted} (Final do expediente)`,
      bg: 'from-[#132F46]/90 via-[#0B1C2C] to-[#07131F]',
      border: 'border-[#C8A45D]/50',
      textColor: 'text-[#F1DEB5]',
      badgeBg: 'bg-[#C8A45D] text-black',
      glow: 'shadow-[0_0_20px_rgba(255,90,0,0.2)]',
      pulse: false,
    };
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r ${statusInfo.bg} border-2 ${statusInfo.border} ${statusInfo.glow} flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono transition-all`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#C8A45D]/20 border border-[#C8A45D]/40 flex items-center justify-center text-[#D8B56B] shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-white text-sm sm:text-base tracking-wide">
              {cycle.formattedLabel}
            </span>
            {cycle.isTransitionWeek && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300">
                🔄 Transição de Mês (Contínua)
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusInfo.badgeBg} ${statusInfo.pulse ? 'animate-pulse' : ''}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="text-[11px] text-[#E8D6B5]/80 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#D8B56B]" />
            <span>{statusInfo.sub}</span>
          </div>
        </div>
      </div>

      {onOpenSettlement && (
        <button
          type="button"
          onClick={onOpenSettlement}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end md:self-center shrink-0"
        >
          <span>Ir para Fechamento Semanal</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
