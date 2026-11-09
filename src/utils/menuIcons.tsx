import React from 'react';
import {
  Users,
  Building2,
  UserCheck,
  Briefcase,
  FolderTree,
  Scissors,
  CheckSquare,
  Wallet,
  FileText,
  User,
  Settings,
  LayoutDashboard,
  Sparkles,
  Crown,
  Heart,
  Star,
  DollarSign,
  Calendar,
  Award,
  ShoppingBag,
  Smile,
  Layers,
  Flame,
  Zap,
  Gem,
  Shield,
  CreditCard,
  PlusCircle,
  Clock,
  TrendingUp,
  Camera,
  Phone,
  MapPin,
  Activity,
  BadgePercent,
  Wand2,
  Gift,
  HelpCircle,
  LucideIcon
} from 'lucide-react';
import employeesIcon from '../assets/images/employees_icon_1787794536367.jpg';
import filiaisIcon from '../assets/images/filiais_icon_1787799238335.jpg';
import gerentesIcon from '../assets/images/gerentes_icon_1787799253434.jpg';
import { ActiveModule, MenuItemCustomization } from '../types';

export { employeesIcon, filiaisIcon, gerentesIcon };

const IMG = 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=';
const SZ = '&image_size=square_hd';

export const ICON_3D_PROMPTS: Partial<Record<ActiveModule, string>> = {
  DASHBOARD: encodeURIComponent('3D bar chart icon with rising arrow, luxury gold and black style, glossy metallic materials, dark background, warm orange glow, cinematic lighting, high quality 3d render'),
  FILIAIS: encodeURIComponent('3D storefront building icon, luxury retail shop, gold accents on glossy black structure, dark background, warm orange rim light, isometric view, high quality 3d render'),
  GERENTES: encodeURIComponent('3D leadership team icon with three executive figures, gold ties and glossy black suits, luxury business style, dark background, warm glow, high quality 3d render'),
  VENDEDORES: encodeURIComponent('3D professional team icon three figures, gold ties glossy black suits, luxury corporate style, dark background warm orange glow, high quality 3d render'),
  FUNCOES: encodeURIComponent('3D clipboard checklist icon with gold checkmarks, glossy black clipboard, luxury office style, dark background with warm glow, high quality 3d render'),
  SERVICOS: encodeURIComponent('3D gold scissors and comb crossed together, barber salon tools, glossy black handle with gold blades, dark background warm orange glow, high quality 3d render'),
  APROVACOES: encodeURIComponent('3D rubber stamp icon with checkmark, glossy gold stamper on black handle base, official approval seal, dark background warm glow, high quality 3d render'),
  VALES: encodeURIComponent('3D calendar icon with gold checkmark badge, glossy black calendar with gold numbers and frame, luxury style, dark background warm orange glow, high quality 3d render'),
  PAGAMENTOS: encodeURIComponent('3D black credit card leaning on stacks of gold coins, glossy luxury finance style, dark background with warm orange glow, cinematic lighting, high quality 3d render'),
  RELATORIOS: encodeURIComponent('3D report document icon with pie chart and bar chart, gold details on black paper, luxury business analytics style, dark background warm glow, high quality 3d render'),
  PERFIL: encodeURIComponent('3D user profile avatar icon, gold circular frame with person silhouette inside, glossy black and gold luxury style, dark background warm glow, high quality 3d render'),
  CONFIGURACOES: encodeURIComponent('3D gear cog icon, metallic glossy gold and black mechanical gear, luxury industrial style, dark background with warm orange glow, cinematic lighting, high quality 3d render'),
  REGISTRAR_SERVICO: encodeURIComponent('3D rocket ship launching, glossy gold and black rocket with orange flames, dynamic angle, luxury speed launch icon, dark space background, high quality 3d render'),
  MEUS_SERVICOS: encodeURIComponent('3D gold and black headphones headset, glossy luxury style, professional audio customer service icon, dark background warm orange glow, high quality 3d render'),
  MINHAS_COMISSOES: encodeURIComponent('3D gold piggy bank with glossy black accents, luxury finance savings style, cute but premium, dark background with warm glow, high quality 3d render'),
  MEUS_VALES: encodeURIComponent('3D wallet icon with gold dollar bill, glossy black leather wallet with gold clasp and cash, luxury finance voucher style, dark background warm glow, high quality 3d render'),
  MEUS_PAGAMENTOS: encodeURIComponent('3D black leather wallet open with gold coins spilling out, glossy luxury premium wallet, finance payment icon, dark background warm orange glow, high quality 3d render'),
};

export const MENU_3D_ICONS: Partial<Record<ActiveModule, string>> = Object.fromEntries(
  (Object.keys(ICON_3D_PROMPTS) as ActiveModule[]).map(k => [k, IMG + ICON_3D_PROMPTS[k]! + SZ])
) as Partial<Record<ActiveModule, string>>;

export interface IconDefinition {
  name: string;
  label: string;
  category: string;
  IconComponent: LucideIcon;
}

export const AVAILABLE_MENU_ICONS: IconDefinition[] = [
  { name: 'Users', label: 'Equipe / Usuários', category: 'Pessoas', IconComponent: Users },
  { name: 'UserCheck', label: 'Líder / Gerente', category: 'Pessoas', IconComponent: UserCheck },
  { name: 'User', label: 'Perfil / Pessoa', category: 'Pessoas', IconComponent: User },
  { name: 'Smile', label: 'Atendimento', category: 'Pessoas', IconComponent: Smile },
  
  { name: 'Scissors', label: 'Tesoura / Corte', category: 'Salão & Beleza', IconComponent: Scissors },
  { name: 'Sparkles', label: 'Brilho / Estética', category: 'Salão & Beleza', IconComponent: Sparkles },
  { name: 'Wand2', label: 'Mágico / Transformação', category: 'Salão & Beleza', IconComponent: Wand2 },
  { name: 'Crown', label: 'Coroa / VIP', category: 'Salão & Beleza', IconComponent: Crown },
  { name: 'Gem', label: 'Diamante / Prime', category: 'Salão & Beleza', IconComponent: Gem },
  { name: 'Flame', label: 'Destaque / Fogo', category: 'Salão & Beleza', IconComponent: Flame },
  { name: 'Heart', label: 'Cuidado / Favorito', category: 'Salão & Beleza', IconComponent: Heart },
  { name: 'Star', label: 'Estrela / Avaliação', category: 'Salão & Beleza', IconComponent: Star },

  { name: 'Building2', label: 'Prédio / Filial', category: 'Estrutura', IconComponent: Building2 },
  { name: 'Briefcase', label: 'Maleta / Cargos', category: 'Estrutura', IconComponent: Briefcase },
  { name: 'FolderTree', label: 'Pastas / Categorias', category: 'Estrutura', IconComponent: FolderTree },
  { name: 'LayoutDashboard', label: 'Dashboard', category: 'Estrutura', IconComponent: LayoutDashboard },
  { name: 'Layers', label: 'Camadas / Módulos', category: 'Estrutura', IconComponent: Layers },
  
  { name: 'Wallet', label: 'Carteira / Caixa', category: 'Financeiro', IconComponent: Wallet },
  { name: 'CreditCard', label: 'Cartão / Vales', category: 'Financeiro', IconComponent: CreditCard },
  { name: 'DollarSign', label: 'Cifrão / Dinheiro', category: 'Financeiro', IconComponent: DollarSign },
  { name: 'BadgePercent', label: 'Porcentagem / Comissão', category: 'Financeiro', IconComponent: BadgePercent },
  { name: 'TrendingUp', label: 'Gráfico / Crescimento', category: 'Financeiro', IconComponent: TrendingUp },

  { name: 'CheckSquare', label: 'Validação / Aprovação', category: 'Gestão', IconComponent: CheckSquare },
  { name: 'FileText', label: 'Documento / Relatório', category: 'Gestão', IconComponent: FileText },
  { name: 'Calendar', label: 'Calendário / Agenda', category: 'Gestão', IconComponent: Calendar },
  { name: 'Clock', label: 'Relógio / Histórico', category: 'Gestão', IconComponent: Clock },
  { name: 'PlusCircle', label: 'Adicionar / Novo', category: 'Gestão', IconComponent: PlusCircle },
  { name: 'Award', label: 'Troféu / Metas', category: 'Gestão', IconComponent: Award },
  { name: 'Shield', label: 'Segurança / Auditoria', category: 'Gestão', IconComponent: Shield },
  { name: 'Settings', label: 'Engrenagem / Configurações', category: 'Gestão', IconComponent: Settings },
  { name: 'ShoppingBag', label: 'Sacola / Vendas', category: 'Gestão', IconComponent: ShoppingBag },
  { name: 'Camera', label: 'Câmera / Fotos', category: 'Gestão', IconComponent: Camera },
  { name: 'MapPin', label: 'Localização / Endereço', category: 'Gestão', IconComponent: MapPin },
  { name: 'Activity', label: 'Atividade / Pulso', category: 'Gestão', IconComponent: Activity },
  { name: 'Zap', label: 'Raio / Rápido', category: 'Gestão', IconComponent: Zap },
  { name: 'Gift', label: 'Presente / Bônus', category: 'Gestão', IconComponent: Gift },
];

export interface MenuItemMeta {
  id: ActiveModule;
  defaultNum: string;
  defaultTitle: string;
  defaultSubtitle: string;
  defaultIconName: string;
  defaultIs3dImage?: boolean;
  forRoles: ('ADMIN' | 'GERENTE' | 'VENDEDOR')[];
}

export const ALL_MENU_MODULES: MenuItemMeta[] = [
  { id: 'DASHBOARD', defaultNum: '01', defaultTitle: 'Dashboard', defaultSubtitle: 'VISÃO GERAL DA REDE', defaultIconName: 'LayoutDashboard', defaultIs3dImage: true, forRoles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
  { id: 'FILIAIS', defaultNum: '', defaultTitle: 'Filiais', defaultSubtitle: 'GESTÃO DE UNIDADES', defaultIconName: 'Building2', defaultIs3dImage: true, forRoles: ['ADMIN'] },
  { id: 'GERENTES', defaultNum: '', defaultTitle: 'Gerentes', defaultSubtitle: 'LÍDERES DE FILIAIS', defaultIconName: 'UserCheck', defaultIs3dImage: true, forRoles: ['ADMIN'] },
  { id: 'VENDEDORES', defaultNum: '', defaultTitle: 'Funcionários', defaultSubtitle: 'PROFISSIONAIS & EQUIPE', defaultIconName: 'Users', defaultIs3dImage: true, forRoles: ['ADMIN', 'GERENTE'] },
  { id: 'FUNCOES', defaultNum: '05', defaultTitle: 'Funções', defaultSubtitle: 'CARGOS & ATIVIDADES', defaultIconName: 'Briefcase', defaultIs3dImage: true, forRoles: ['ADMIN'] },
  { id: 'SERVICOS', defaultNum: '07', defaultTitle: 'Serviços', defaultSubtitle: 'CATÁLOGO & % COMISSÃO', defaultIconName: 'Scissors', defaultIs3dImage: true, forRoles: ['ADMIN'] },
  { id: 'APROVACOES', defaultNum: '08', defaultTitle: 'Aprovações', defaultSubtitle: 'SERVIÇOS & VALES', defaultIconName: 'CheckSquare', defaultIs3dImage: true, forRoles: ['ADMIN', 'GERENTE'] },
  { id: 'VALES', defaultNum: '04', defaultTitle: 'Aprovar Vales', defaultSubtitle: 'ADIANTAMENTOS DA FILIAL', defaultIconName: 'CreditCard', defaultIs3dImage: true, forRoles: ['GERENTE'] },
  { id: 'PAGAMENTOS', defaultNum: '09', defaultTitle: 'Pagamentos', defaultSubtitle: 'FECHAMENTO SEMANAL', defaultIconName: 'Wallet', defaultIs3dImage: true, forRoles: ['ADMIN', 'GERENTE'] },
  { id: 'RELATORIOS', defaultNum: '10', defaultTitle: 'Relatórios', defaultSubtitle: 'BI & EXPORTAÇÃO PDF/XLS', defaultIconName: 'FileText', defaultIs3dImage: true, forRoles: ['ADMIN', 'GERENTE'] },
  { id: 'PERFIL', defaultNum: '11', defaultTitle: 'Meu Perfil', defaultSubtitle: 'DADOS & SENHA', defaultIconName: 'User', defaultIs3dImage: true, forRoles: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
  { id: 'CONFIGURACOES', defaultNum: '12', defaultTitle: 'Configurações', defaultSubtitle: 'REGRAS & PARÂMETROS', defaultIconName: 'Settings', defaultIs3dImage: true, forRoles: ['ADMIN'] },
  { id: 'REGISTRAR_SERVICO', defaultNum: '02', defaultTitle: 'Registrar Serviço', defaultSubtitle: 'LANÇAMENTO RÁPIDO', defaultIconName: 'PlusCircle', defaultIs3dImage: true, forRoles: ['VENDEDOR'] },
  { id: 'MEUS_SERVICOS', defaultNum: '03', defaultTitle: 'Meus Serviços', defaultSubtitle: 'HISTÓRICO ATENDIMENTOS', defaultIconName: 'Clock', defaultIs3dImage: true, forRoles: ['VENDEDOR'] },
  { id: 'MINHAS_COMISSOES', defaultNum: '04', defaultTitle: 'Minhas Comissões', defaultSubtitle: 'EXTRATO DE GANHOS', defaultIconName: 'TrendingUp', defaultIs3dImage: true, forRoles: ['VENDEDOR'] },
  { id: 'MEUS_VALES', defaultNum: '05', defaultTitle: 'Meus Vales', defaultSubtitle: 'PEDIDOS & HISTÓRICO', defaultIconName: 'CreditCard', defaultIs3dImage: true, forRoles: ['VENDEDOR'] },
  { id: 'MEUS_PAGAMENTOS', defaultNum: '06', defaultTitle: 'Meus Pagamentos', defaultSubtitle: 'EXTRATOS SEMANAIS', defaultIconName: 'FileText', defaultIs3dImage: true, forRoles: ['VENDEDOR'] },
];

export function getLucideIconComponent(name?: string): LucideIcon | null {
  if (!name) return null;
  const found = AVAILABLE_MENU_ICONS.find(i => i.name === name);
  return found ? found.IconComponent : null;
}

function getBuiltin3dIcon(moduleId: ActiveModule): string | undefined {
  switch (moduleId) {
    case 'VENDEDORES': return employeesIcon;
    case 'FILIAIS': return filiaisIcon;
    case 'GERENTES': return gerentesIcon;
    default: return MENU_3D_ICONS[moduleId];
  }
}

function render3dIconImage(src: string, alt: string, sizeClass: string = 'w-11 h-11 sm:w-12 sm:h-12') {
  return (
    <div className="relative group-hover:scale-125 transition-transform duration-300 ease-out flex items-center justify-center shrink-0">
      <img
        src={src}
        alt={alt}
        className={`${sizeClass} rounded-xl object-cover shadow-[0_4px_22px_rgba(255,90,0,0.7)] drop-shadow-[0_0_14px_rgba(255,90,0,0.7)] shrink-0 border-0 bg-transparent`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export function renderDynamicMenuIcon(
  moduleId: ActiveModule,
  customization?: MenuItemCustomization,
  fallbackDefaultIcon?: React.ReactNode
): { iconNode: React.ReactNode; isCustomImage: boolean; customNumber?: string; showNumber: boolean; title?: string } {
  const showNumber = customization?.showNumber !== undefined 
    ? customization.showNumber 
    : (moduleId === 'VENDEDORES' || moduleId === 'FILIAIS' || moduleId === 'GERENTES' ? false : true);

  const customNumber = customization?.customNumber;
  const customTitle = customization?.customTitle;

  if (customization?.customImageUrl) {
    const sizeClasses = customization.iconSize === 'xl' 
      ? 'w-12 h-12 rounded-xl' 
      : customization.iconSize === 'lg'
      ? 'w-10 h-10 rounded-xl'
      : customization.iconSize === 'sm'
      ? 'w-6 h-6 rounded-lg'
      : 'w-8 h-8 rounded-lg';

    return {
      iconNode: (
        <div className="relative group-hover:scale-125 transition-transform duration-300 ease-out flex items-center justify-center shrink-0">
          <img
            src={customization.customImageUrl}
            alt="Menu Icon"
            className={`${sizeClasses} object-cover shadow-[0_4px_20px_rgba(255,90,0,0.6)] drop-shadow-[0_0_12px_rgba(255,90,0,0.65)] shrink-0 border-0 bg-transparent`}
            referrerPolicy="no-referrer"
          />
        </div>
      ),
      isCustomImage: true,
      customNumber,
      showNumber,
      title: customTitle,
    };
  }

  if (customization?.lucideIconName) {
    const IconComp = getLucideIconComponent(customization.lucideIconName);
    if (IconComp) {
      return {
        iconNode: (
          <div className="relative group-hover:scale-125 transition-transform duration-300 ease-out flex items-center justify-center shrink-0">
            <IconComp className="w-5 h-5 text-[#D7C08E] group-hover:text-white drop-shadow-[0_0_12px_rgba(255,90,0,0.7)]" />
          </div>
        ),
        isCustomImage: false,
        customNumber,
        showNumber,
        title: customTitle,
      };
    }
  }

  const builtin3d = getBuiltin3dIcon(moduleId);
  if (builtin3d) {
    return {
      iconNode: render3dIconImage(builtin3d, customTitle || moduleId),
      isCustomImage: true,
      customNumber,
      showNumber: moduleId === 'VENDEDORES' || moduleId === 'FILIAIS' || moduleId === 'GERENTES' ? false : showNumber,
      title: customTitle,
    };
  }

  return {
    iconNode: (
      <div className="relative group-hover:scale-125 transition-transform duration-300 ease-out flex items-center justify-center shrink-0">
        {fallbackDefaultIcon ? (
          fallbackDefaultIcon
        ) : (
          <Sparkles className="w-5 h-5 text-[#D7C08E] group-hover:text-white drop-shadow-[0_0_12px_rgba(255,90,0,0.7)]" />
        )}
      </div>
    ),
    isCustomImage: false,
    customNumber,
    showNumber,
    title: customTitle,
  };
}
