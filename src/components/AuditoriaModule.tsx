import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  User as UserIcon, 
  Activity, 
  FileText, 
  Calendar, 
  Download,
  Filter
} from 'lucide-react';
import { AuditoriaLog, User } from '../types';
import { StorageService } from '../services/storage';
import { exportToCsv } from '../utils/exportUtils';

interface AuditoriaModuleProps {
  currentUser: User;
}

export const AuditoriaModule: React.FC<AuditoriaModuleProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('ALL');

  useEffect(() => {
    const allLogs = StorageService.getAuditoriaLogs();
    setLogs(allLogs);
  }, []);

  const filteredLogs = logs.filter(l => {
    if (tipoFiltro !== 'ALL' && l.registroTipo !== tipoFiltro) return false;
    if (searchTerm) {
      const matchDesc = l.registroDescricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUser = l.usuarioNome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAcao = l.acao.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchDesc && !matchUser && !matchAcao) return false;
    }
    return true;
  });

  const handleExportLogs = () => {
    const data = filteredLogs.map(l => ({
      ID: l.id,
      'Data/Hora': new Date(l.dataHora).toLocaleString('pt-BR'),
      'Usuário': l.usuarioNome,
      'Perfil': l.usuarioRole,
      'Ação': l.acao,
      'Tipo de Registro': l.registroTipo,
      'ID Registro': l.registroId,
      'Detalhes': l.registroDescricao,
    }));
    exportToCsv(data, `logs_auditoria_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C8A45D]" />
            Trilha de Auditoria & Segurança
          </h2>
          <p className="text-xs text-[#B49A73]">
            Registro cronológico imutável de todas as ações administrativas, financeiras e operacionais.
          </p>
        </div>

        <button
          onClick={handleExportLogs}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/40 border border-[#C8A45D]/30 text-[#E8D6B5] hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#D8B56B]" />
          <span>Exportar Logs (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        <div>
          <label className="block text-[#D7C08E] mb-1 uppercase">Tipo de Registro</label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
          >
            <option value="ALL">Todos os Tipos de Entidade</option>
            <option value="FILIAL">Filiais</option>
            <option value="GERENTE">Gerentes</option>
            <option value="VENDEDOR">Funcionários</option>
            <option value="FUNCAO">Funções / Cargos</option>
            <option value="SERVICO">Serviços / Preços</option>
            <option value="SERVICO_REGISTRO">Atendimentos / Comissões</option>
            <option value="VALE">Vales / Adiantamentos</option>
            <option value="PAGAMENTO">Fechamentos Semanais</option>
            <option value="SISTEMA">Sistema / Autenticação</option>
          </select>
        </div>

        <div>
          <label className="block text-[#D7C08E] mb-1 uppercase">Buscar nos Logs</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
            <input
              type="text"
              placeholder="Buscar por usuário, ação ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50"
            />
          </div>
        </div>
      </div>

      {/* Logs Timeline Table */}
      <div className="rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className={`overflow-x-auto custom-scrollbar ${filteredLogs.length > 10 ? 'max-h-[520px] overflow-y-auto custom-scrollbar' : ''}`}>
          <table className="w-full text-left text-xs text-white">
            <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${filteredLogs.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Usuário Responsável</th>
                <th className="py-3 px-4">Perfil</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Entidade</th>
                <th className="py-3 px-4">Descrição da Modificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8A45D]/10 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                  <td className="py-3 px-4 text-[#B49A73] whitespace-nowrap">
                    {new Date(log.dataHora).toLocaleDateString('pt-BR')} {new Date(log.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                    {log.usuarioNome}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-black/40 border border-[#C8A45D]/30 text-[#D7C08E]">
                      {log.usuarioRole}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#E8D6B5] whitespace-nowrap">
                    {log.acao}
                  </td>
                  <td className="py-3 px-4 text-[#B49A73]">
                    {log.registroTipo}
                  </td>
                  <td className="py-3 px-4 text-[#E8D6B5]/90">
                    {log.registroDescricao}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#B49A73] font-mono">
                    Nenhum registro de auditoria encontrado.
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
