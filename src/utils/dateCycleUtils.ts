/**
 * Utility functions for Weekly Cycle (Monday to Saturday) calculations,
 * transition weeks (months spanning), and Monthly Revenue Consolidation.
 * With Gatekeeper simulation support.
 */

export type CycleGatekeeperStatus =
  | 'CICLO_ABERTO'          // Segunda a sexta
  | 'FECHAMENTO_HOJE'       // Sábado
  | 'DOMINGO_ABERTO'        // Domingo (acesso ao aplicativo liberado)
  | 'LIBERACAO_PENDENTE'    // Segunda, antes do pagamento de todos
  | 'CICLO_LIBERADO';       // Segunda, após o pagamento de todos

export interface WeekCycleInfo {
  weekNumberInMonth: number; // 1 to 5
  monthName: string; // 'Agosto', 'Setembro', etc.
  year: number;
  startDate: Date; // Monday 00:00:00
  endDate: Date; // Saturday 23:59:59
  startDateStr: string; // 'YYYY-MM-DD'
  endDateStr: string; // 'YYYY-MM-DD'
  formattedLabel: string; // '4ª Semana de Agosto (24/08 a 29/08/2026)'
  isTransitionWeek: boolean; // crosses two different months
  closingDateFormatted: string; // 'Sábado, 29/08/2026'
  status: 'ABERTO' | 'FECHAMENTO_HOJE' | 'FECHADO';
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Returns Monday (00:00:00) and Saturday (23:59:59) for any given date.
 */
export function getMondayAndSaturday(d: Date): { monday: Date; saturday: Date } {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  
  // Calculate difference to Monday
  // If Sunday (0), Monday was 6 days ago (or current cycle closed yesterday)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  return { monday, saturday };
}

/**
 * Computes week cycle information for any reference date.
 */
export function calculateWeekCycle(refDate: Date = new Date()): WeekCycleInfo {
  const { monday, saturday } = getMondayAndSaturday(refDate);

  // Month reference is based on the Monday start of the week
  const monthIdx = monday.getMonth();
  const monthName = MONTH_NAMES[monthIdx];
  const year = monday.getFullYear();

  // Determine week number in month based on Monday
  // We count how many Mondays came before or on this Monday in the same month
  let mondayCounter = 1;
  const temp = new Date(year, monthIdx, 1);
  while (temp.getDay() !== 1) {
    temp.setDate(temp.getDate() + 1);
  }
  while (temp.getTime() < monday.getTime()) {
    temp.setDate(temp.getDate() + 7);
    if (temp.getMonth() === monthIdx) {
      mondayCounter++;
    }
  }

  const isTransitionWeek = monday.getMonth() !== saturday.getMonth();
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const startDay = pad(monday.getDate());
  const startMonth = pad(monday.getMonth() + 1);
  const endDay = pad(saturday.getDate());
  const endMonth = pad(saturday.getMonth() + 1);

  const startDateStr = `${monday.getFullYear()}-${startMonth}-${startDay}`;
  const endDateStr = `${saturday.getFullYear()}-${endMonth}-${endDay}`;

  const currentDay = refDate.getDay();
  let status: 'ABERTO' | 'FECHAMENTO_HOJE' | 'FECHADO' = 'ABERTO';
  if (currentDay === 6) {
    status = 'FECHAMENTO_HOJE';
  } else if (currentDay === 0) {
    status = 'FECHADO';
  }

  let formattedLabel = `${mondayCounter}ª Semana de ${monthName} (${startDay}/${startMonth} a ${endDay}/${endMonth}/${saturday.getFullYear()})`;
  if (isTransitionWeek) {
    formattedLabel = `Semana ${mondayCounter} / Transição (${startDay}/${MONTH_NAMES[monday.getMonth()].slice(0, 3)} a ${endDay}/${MONTH_NAMES[saturday.getMonth()].slice(0, 3)}/${saturday.getFullYear()})`;
  }

  const closingDateFormatted = `Sábado, ${endDay}/${endMonth}/${saturday.getFullYear()}`;

  return {
    weekNumberInMonth: mondayCounter,
    monthName,
    year,
    startDate: monday,
    endDate: saturday,
    startDateStr,
    endDateStr,
    formattedLabel,
    isTransitionWeek,
    closingDateFormatted,
    status
  };
}

export function getPreviousWeekCycle(refDate: Date = new Date()): WeekCycleInfo {
  const d = new Date(refDate);
  d.setDate(d.getDate() - 7);
  return calculateWeekCycle(d);
}

const SIMULATION_DATE_KEY = 'nexus_simulation_date';

export function setSimulationDate(dateStr: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (dateStr) {
    localStorage.setItem(SIMULATION_DATE_KEY, dateStr);
  } else {
    localStorage.removeItem(SIMULATION_DATE_KEY);
  }
}

export function getSimulationDate(): Date | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SIMULATION_DATE_KEY);
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function getEffectiveNow(): Date {
  return getSimulationDate() || new Date();
}

export function getWeekdayName(dayIndex: number): string {
  return [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ][dayIndex] || '';
}
