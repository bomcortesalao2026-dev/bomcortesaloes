import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  UserCheck, 
  Users, 
  Briefcase, 
  Scissors, 
  FolderTree,
  CheckSquare, 
  Wallet, 
  FileText, 
  ShieldAlert, 
  User, 
  Settings, 
  LogOut,
  PlusCircle,
  Clock,
  TrendingUp,
  CreditCard,
  X
} from 'lucide-react';
import { User as UserType, ActiveModule, SystemConfig, Funcao } from '../types';
import { StorageService } from '../services/storage';
import { SalonLogo } from './SalonLogo';
import { renderDynamicMenuIcon } from '../utils/menuIcons';
import employeesIcon from '../assets/images/employees_icon_1787794536367.jpg';

interface CyberSidebarProps {
  currentUser: UserType;
  activeModule: ActiveModule | string;
  onNavigate?: (module: ActiveModule) => void;
  onSelectModule?: (module: ActiveModule) => void;
  isOpen: boolean;
  onClose: () => void;
  pendingCount?: number;
  pendingValesCount?: number;
  onLogout: () => void;
}

export const CyberSidebar: React.FC<CyberSidebarProps> = ({
  currentUser,
  activeModule,
  onNavigate,
  onSelectModule,
  isOpen,
  onClose,
  pendingCount = 0,
  pendingValesCount = 0,
  onLogout,
}) => {
  const role = currentUser.role;
  const [config, setConfig] = useState<SystemConfig>(StorageService.getConfig());
  const [funcoes, setFuncoes] = useState<Funcao[]>(StorageService.getFuncoes());

  useEffect(() => {
    const handleStorageChange = () => {
      setConfig(StorageService.getConfig());
      setFuncoes(StorageService.getFuncoes());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('nexus_config_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nexus_config_updated', handleStorageChange);
    };
  }, []);

  const handleNav = (mod: ActiveModule) => {
    if (onNavigate) onNavigate(mod);
    if (onSelectModule) onSelectModule(mod);
  };

  interface MenuItem {
    id: ActiveModule;
    num?: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    isCustomImage?: boolean;
    badge?: number;
  }

  const getMenuItems = (): MenuItem[] => {
    const customizations = config.menuCustomizations || {};

    const buildItem = (
      id: ActiveModule, 
      defaultNum: string, 
      defaultTitle: string, 
      defaultSubtitle: string, 
      defaultIcon: React.ReactNode, 
      badge?: number
    ): MenuItem => {
      const cust = customizations[id];
      const dynamic = renderDynamicMenuIcon(id, cust, defaultIcon);

      return {
        id,
        num: dynamic.showNumber ? (dynamic.customNumber ?? defaultNum) : '',
        title: dynamic.title || defaultTitle,
        subtitle: defaultSubtitle,
        icon: dynamic.iconNode,
        isCustomImage: dynamic.isCustomImage,
        badge
      };
    };

    if (role === 'ADMIN') {
      return [
        buildItem('DASHBOARD', '01', 'Dashboard', 'VISÃO GERAL DA REDE', <LayoutDashboard className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('FILIAIS', '02', 'Filiais', 'GESTÃO DE UNIDADES', <Building2 className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('GERENTES', '03', 'Gerentes', 'LÍDERES DE FILIAIS', <UserCheck className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('VENDEDORES', '04', 'Funcionários', 'PROFISSIONAIS & EQUIPE', <Users className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('FUNCOES', '05', 'Funções', 'CARGOS & ATIVIDADES', <Briefcase className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('SERVICOS', '06', 'Serviços', 'CATÁLOGO & % COMISSÃO', <Scissors className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('APROVACOES', '07', 'Aprovações', 'SERVIÇOS & VALES', <CheckSquare className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />, pendingCount + pendingValesCount),
        buildItem('VALES', '08', 'Vales', 'GESTÃO DE ADIANTAMENTOS', <CreditCard className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />, pendingValesCount),
        buildItem('PAGAMENTOS', '09', 'Pagamentos', 'FECHAMENTO SEMANAL', <Wallet className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('RELATORIOS', '10', 'Relatórios', 'BI & EXPORTAÇÃO PDF/XLS', <FileText className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('PERFIL', '11', 'Meu Perfil', 'DADOS & SENHA', <User className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('CONFIGURACOES', '12', 'Configurações', 'REGRAS, PARÂMETROS & AUDITORIA', <Settings className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
      ];
    }

    if (role === 'GERENTE') {
      return [
        buildItem('DASHBOARD', '01', 'Dashboard Filial', 'PAINEL DA UNIDADE', <LayoutDashboard className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('VENDEDORES', '02', 'Funcionários', 'EQUIPE DA FILIAL', <Users className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('APROVACOES', '03', 'Aprovar Serviços', 'VALIDAR ATENDIMENTOS', <CheckSquare className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />, pendingCount),
        buildItem('VALES', '04', 'Aprovar Vales', 'ADIANTAMENTOS DA FILIAL', <CreditCard className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />, badgeVales(pendingValesCount)),
        buildItem('PAGAMENTOS', '05', 'Pagamentos', 'FECHAMENTO SEMANAL', <Wallet className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('RELATORIOS', '06', 'Relatórios Filial', 'DESEMPENHO LOCAL', <FileText className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
        buildItem('PERFIL', '07', 'Meu Perfil', 'DADOS & SENHA', <User className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
      ];
    }

    // VENDEDOR / PROFISSIONAL
    return [
      buildItem('DASHBOARD', '01', 'Meu Painel', 'RESUMO FINANCEIRO', <LayoutDashboard className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
      buildItem('REGISTRAR_SERVICO', '02', 'Registrar Serviço', 'LANÇAMENTO RÁPIDO', <PlusCircle className="w-4 h-4 text-[#D9B76C] drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
      buildItem('MEUS_SERVICOS', '03', 'Meus Serviços', 'HISTÓRICO ATENDIMENTOS', <Clock className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
      buildItem('MINHAS_COMISSOES', '04', 'Minhas Comissões', 'EXTRATO DE GANHOS', <TrendingUp className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
      buildItem('MEUS_VALES', '05', 'Meus Vales', 'PEDIDOS & HISTÓRICO', <CreditCard className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
      buildItem('MEUS_PAGAMENTOS', '06', 'Meus Pagamentos', 'EXTRATOS SEMANAIS', <FileText className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
      buildItem('PERFIL', '07', 'Meu Perfil', 'MEUS DADOS & SENHA', <User className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,90,0,0.5)]" />),
    ];
  };

  function badgeVales(val: number) {
    return val > 0 ? val : undefined;
  }

  const menuItems = getMenuItems();

  return (
    <>
      <style>{`
        @keyframes badgeServicosPulse {
          0%   { background: linear-gradient(135deg, #ff7a1a, #dc2626); box-shadow: 0 0 14px #ff7a1a, inset 0 0 6px #fff7ed; }
          33%  { background: linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 0 22px #dc2626, inset 0 0 8px #fee2e2; }
          66%  { background: linear-gradient(135deg, #f97316, #facc15); box-shadow: 0 0 18px #f97316, inset 0 0 8px #fef3c7; }
          100% { background: linear-gradient(135deg, #ff7a1a, #dc2626); box-shadow: 0 0 14px #ff7a1a, inset 0 0 6px #fff7ed; }
        }
        @keyframes badgeValesPulse {
          0%   { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 0 14px #2563eb, inset 0 0 6px #dbeafe; }
          33%  { background: linear-gradient(135deg, #7c3aed, #06b6d4); box-shadow: 0 0 22px #7c3aed, inset 0 0 8px #ede9fe; }
          66%  { background: linear-gradient(135deg, #06b6d4, #3b82f6); box-shadow: 0 0 18px #06b6d4, inset 0 0 8px #cffafe; }
          100% { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 0 14px #2563eb, inset 0 0 6px #dbeafe; }
        }
        .badge-servicos-pulse {
          animation: badgeServicosPulse 1.6s ease-in-out infinite;
        }
        .badge-vales-pulse {
          animation: badgeValesPulse 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        id="cyber-main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-[300px] sm:w-[320px] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col p-4 pointer-events-auto`}
      >
          {/* Container limpo e corporativo */}
          <div className="relative flex flex-col h-full rounded-2xl bg-[var(--sidebar-bg)] shadow-xl overflow-hidden">
            
            {/* Header / Logo */}
            <div className="p-4 flex items-center justify-between relative z-10">
              <SalonLogo size="md" showText={true} className="max-w-[230px]" />
  
              {/* Mobile close */}
              <button
                onClick={onClose}
                className="lg:hidden p-1 text-white/70 hover:text-white rounded-lg hover:bg-[#0C1F31]/90/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
  
            {/* User Status Bar */}
            <div className="px-4 py-3 bg-[#0C1F31]/90/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#C8A45D]" />
                <span className="text-white truncate font-medium">{currentUser.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#C8A45D]/20 text-[#C8A45D] text-[10px] font-semibold">
                {role === 'ADMIN'
                  ? 'Administrador'
                  : role === 'GERENTE'
                  ? 'Gerente'
                  : (funcoes.find(f => f.id === currentUser.funcaoId)?.name || 'Profissional')}
              </span>
            </div>
  
            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar relative z-10">
              {menuItems.map((item) => {
                const isActive = activeModule === item.id || 
                  (item.id === 'REGISTRAR_SERVICO' && activeModule === 'VENDEDOR_REGISTRO') ||
                  (item.id === 'MEUS_SERVICOS' && activeModule === 'VENDEDOR_SERVICOS') ||
                  (item.id === 'MINHAS_COMISSOES' && activeModule === 'VENDEDOR_COMISSOES') ||
                  (item.id === 'SOLICITAR_VALE' && activeModule === 'VENDEDOR_VALES') ||
                  (item.id === 'MEUS_VALES' && activeModule === 'VENDEDOR_VALES') ||
                  (item.id === 'MEUS_PAGAMENTOS' && activeModule === 'VENDEDOR_PAGAMENTOS') ||
                  (item.id === 'CONFIGURACOES' && activeModule === 'PERFIL');
  
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id.toLowerCase()}`}
                    onClick={() => {
                      handleNav(item.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`w-full text-left group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] shadow-md border-l-4 border-[#C8A45D]'
                        : 'text-white/70 hover:text-white hover:bg-[#0C1F31]/90/5'
                    }`}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center">
                      {item.isCustomImage ? (
                        item.icon
                      ) : (
                        React.cloneElement(item.icon as React.ReactElement, {
                          className: `w-5 h-5 ${isActive ? 'text-[var(--sidebar-bg)]' : 'text-[#C8A45D]'} drop-shadow-none`
                        })
                      )}
                    </div>
  
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-bold tracking-wide truncate ${isActive ? 'text-[var(--sidebar-bg)]' : 'text-white'}`}>
                        {item.title}
                      </div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-[var(--sidebar-bg)]/70' : 'text-white/50'}`}>
                        {item.subtitle}
                      </div>
                    </div>
  
                    {Boolean(item.badge && item.badge > 0) && (
                      <span
                        className={`relative inline-flex items-center justify-center min-w-[48px] min-h-[36px] px-4 py-1.5 text-[20px] font-black rounded-full text-white border-2 border-white/60 ${
                          item.id === 'APROVACOES'
                            ? 'badge-servicos-pulse'
                            : item.id === 'VALES'
                            ? 'badge-vales-pulse'
                            : 'bg-gradient-to-br from-[#C8A45D] to-[#9F7B2E] shadow-[0_0_16px_rgba(200,164,93,0.75)]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
  
            {/* Footer & Logout */}
            <div className="p-3 bg-black/20 relative z-10 space-y-2">
              <button
                id="sidebar-logout-btn"
                onClick={onLogout}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  <span>Desconectar / Sair</span>
                </div>
              </button>
  
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 px-1">
                <span>NEXUS // SYS.V4.2</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ONLINE
                </span>
              </div>
            </div>
  
          </div>
        </aside>
      </>
    );
  };
  
