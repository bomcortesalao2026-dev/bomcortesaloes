import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Check, 
  Sliders, 
  Eye, 
  Image as ImageIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Hash,
  Type,
  LayoutGrid
} from 'lucide-react';
import { 
  ActiveModule, 
  MenuItemCustomization, 
  SystemConfig,
  User 
} from '../types';
import { 
  ALL_MENU_MODULES, 
  AVAILABLE_MENU_ICONS, 
  MenuItemMeta, 
  getLucideIconComponent, 
  renderDynamicMenuIcon 
} from '../utils/menuIcons';

interface MenuIconCustomizerProps {
  config: SystemConfig;
  onChange: (updatedMenuCustomizations: Record<string, MenuItemCustomization>) => void;
  currentUser: User;
}

export const MenuIconCustomizer: React.FC<MenuIconCustomizerProps> = ({
  config,
  onChange,
  currentUser
}) => {
  const [menuCustomizations, setMenuCustomizations] = useState<Record<string, MenuItemCustomization>>(
    config.menuCustomizations || {}
  );
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'ADMIN' | 'GERENTE' | 'VENDEDOR'>('ALL');
  const [activeEditingModule, setActiveEditingModule] = useState<ActiveModule | null>(null);
  const [iconPickerOpenFor, setIconPickerOpenFor] = useState<ActiveModule | null>(null);
  const [iconCategoryFilter, setIconCategoryFilter] = useState<string>('TODOS');
  const [searchIconTerm, setSearchIconTerm] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadTarget, setCurrentUploadTarget] = useState<ActiveModule | null>(null);

  const updateModuleCustomization = (moduleId: ActiveModule, partial: Partial<MenuItemCustomization>) => {
    const updated = {
      ...menuCustomizations,
      [moduleId]: {
        ...(menuCustomizations[moduleId] || {}),
        ...partial
      }
    };
    setMenuCustomizations(updated);
    onChange(updated);
  };

  const handleResetModule = (moduleId: ActiveModule) => {
    const updated = { ...menuCustomizations };
    delete updated[moduleId];
    setMenuCustomizations(updated);
    onChange(updated);
  };

  const handleResetAll = () => {
    setMenuCustomizations({});
    onChange({});
  };

  // Image upload trigger
  const triggerImageUpload = (moduleId: ActiveModule) => {
    setCurrentUploadTarget(moduleId);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadTarget) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateModuleCustomization(currentUploadTarget, {
        customImageUrl: dataUrl,
        lucideIconName: undefined, // Clear lucide icon if image uploaded
        iconSize: currentUploadTarget === 'VENDEDORES' ? 'xl' : 'lg'
      });
      setCurrentUploadTarget(null);
    };
    reader.onerror = () => {
      setUploadError('Erro ao ler a imagem selecionada.');
      setCurrentUploadTarget(null);
    };
    reader.readAsDataURL(file);
  };

  const filteredModules = ALL_MENU_MODULES.filter(m => {
    if (selectedRoleFilter === 'ALL') return true;
    return m.forRoles.includes(selectedRoleFilter);
  });

  const categories = ['TODOS', 'Salão & Beleza', 'Pessoas', 'Estrutura', 'Financeiro', 'Gestão'];

  const filteredIcons = AVAILABLE_MENU_ICONS.filter(i => {
    const matchesCat = iconCategoryFilter === 'TODOS' || i.category === iconCategoryFilter;
    const matchesSearch = !searchIconTerm.trim() || 
      i.label.toLowerCase().includes(searchIconTerm.toLowerCase()) || 
      i.name.toLowerCase().includes(searchIconTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-6 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-6">
      
      {/* Hidden File Input for Image Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C8A45D]/20 pb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C8A45D]" />
            Personalizador de Ícones & Itens do Menu Lateral
          </h3>
          <p className="text-xs text-[#B49A73] mt-0.5">
            Troque o ícone de qualquer item do menu por uma <strong>imagem/3D personalizada</strong> do seu computador ou escolha da nossa galeria de ícones modernos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          className="px-3 py-1.5 rounded-xl bg-black/40 border border-[#C8A45D]/30 hover:border-[#D9B76C] text-[#E8D6B5] hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#D7C08E]" />
          <span>Restaurar Padrões</span>
        </button>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
          <span>{uploadError}</span>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-[#D7C08E] mr-1">Filtrar por Módulos:</span>
        {(['ALL', 'ADMIN', 'GERENTE', 'VENDEDOR'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedRoleFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              selectedRoleFilter === tab
                ? 'bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'bg-black/40 text-[#B49A73] hover:text-white border border-[#C8A45D]/20'
            }`}
          >
            {tab === 'ALL' && 'Todos os Módulos'}
            {tab === 'ADMIN' && 'Administrador (Rede)'}
            {tab === 'GERENTE' && 'Gerente (Filial)'}
            {tab === 'VENDEDOR' && 'Funcionários'}
          </button>
        ))}
      </div>

      {/* Grid of Menu Modules to Customize */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map((item) => {
          const cust = menuCustomizations[item.id] || {};
          const isExpanded = activeEditingModule === item.id;
          const isPickingIcon = iconPickerOpenFor === item.id;

          const dynamicRender = renderDynamicMenuIcon(item.id, cust);
          const hasCustomization = Boolean(cust.customImageUrl || cust.lucideIconName || cust.showNumber !== undefined || cust.customNumber || cust.customTitle);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl transition-all border ${
                isExpanded 
                  ? 'bg-[#10283D] border-[#D9B76C] shadow-[0_0_20px_rgba(255,90,0,0.2)]' 
                  : 'bg-[#0A1A2A]/80 border-[#C8A45D]/25 hover:border-[#C8A45D]/50'
              }`}
            >
              {/* Item Card Header */}
              <div className="flex items-center justify-between gap-3">
                
                {/* Left: Preview Icon & Titles */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Dynamic Icon Preview without border */}
                  <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center p-0.5 shrink-0 drop-shadow-[0_4px_16px_rgba(255,90,0,0.6)]">
                    {dynamicRender.iconNode}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {dynamicRender.showNumber && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#C8A45D]/20 text-[#D7C08E] font-bold">
                          {dynamicRender.customNumber || item.defaultNum}
                        </span>
                      )}
                      <span className="text-xs font-bold text-white truncate">
                        {cust.customTitle || item.defaultTitle}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#B49A73] font-mono block truncate">
                      {item.defaultSubtitle}
                    </span>
                    {hasCustomization && (
                      <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Personalizado
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Quick Action Toggle */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveEditingModule(isExpanded ? null : item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isExpanded 
                        ? 'bg-[#C8A45D] text-white' 
                        : 'bg-[#C8A45D]/20 text-[#F1DEB5] hover:bg-[#C8A45D]/30 border border-[#C8A45D]/30'
                    }`}
                  >
                    <span>Editar</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expandable Editing Panel */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#C8A45D]/20 space-y-4 animate-fadeIn">
                  
                  {/* Action 1: Upload Custom Image or Choose Icon */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono text-[#D7C08E] font-bold">
                      1. Ícone / Imagem Visual:
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => triggerImageUpload(item.id)}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D]/25 to-[#1a0702] border border-[#C8A45D]/50 hover:border-[#D9B76C] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(255,90,0,0.2)]"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#D8B56B]" />
                        <span>Carregar Imagem / 3D do Computador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIconPickerOpenFor(isPickingIcon ? null : item.id)}
                        className="px-3 py-2 rounded-xl bg-black/50 border border-[#C8A45D]/30 hover:border-[#D9B76C] text-[#E8D6B5] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <LayoutGrid className="w-3.5 h-3.5 text-[#D7C08E]" />
                        <span>Escolher da Galeria ({AVAILABLE_MENU_ICONS.length} ícones)</span>
                      </button>

                      {hasCustomization && (
                        <button
                          type="button"
                          onClick={() => handleResetModule(item.id)}
                          className="px-2.5 py-2 rounded-xl bg-rose-950/30 border border-rose-500/40 hover:bg-rose-900/50 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Restaurar ícone padrão"
                        >
                          <RotateCcw className="w-3 h-3 text-rose-400" />
                          <span>Padrão</span>
                        </button>
                      )}
                    </div>

                    {cust.customImageUrl && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/40 flex items-center justify-between text-[11px] text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Imagem personalizada ativa
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#D7C08E]">Tamanho:</span>
                          <select
                            value={cust.iconSize || 'lg'}
                            onChange={(e) => updateModuleCustomization(item.id, { iconSize: e.target.value as any })}
                            className="bg-[#10283D] border border-[#C8A45D]/40 text-white rounded px-2 py-0.5 text-[10px]"
                          >
                            <option value="sm">Pequeno (24px)</option>
                            <option value="md">Médio (32px)</option>
                            <option value="lg">Grande (40px)</option>
                            <option value="xl">Destaque (48px)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Icon Picker Gallery (If Opened) */}
                  {isPickingIcon && (
                    <div className="p-3 rounded-xl bg-black/70 border border-[#C8A45D]/40 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-[#F1DEB5] font-bold">
                          Galeria de Ícones:
                        </span>
                        <input
                          type="text"
                          placeholder="Buscar ícone..."
                          value={searchIconTerm}
                          onChange={(e) => setSearchIconTerm(e.target.value)}
                          className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-[11px] rounded-lg px-2.5 py-1 outline-none focus:border-[#D8B56B] w-36"
                        />
                      </div>

                      {/* Category Pills */}
                      <div className="flex flex-wrap gap-1">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setIconCategoryFilter(cat)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                              iconCategoryFilter === cat 
                                ? 'bg-[#C8A45D] text-white font-bold' 
                                : 'bg-[#1a0802] text-[#B49A73] hover:text-white border border-[#C8A45D]/20'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Icons Grid */}
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-1">
                        {filteredIcons.map((ic) => {
                          const IconComp = ic.IconComponent;
                          const isSelected = cust.lucideIconName === ic.name;

                          return (
                            <button
                              key={ic.name}
                              type="button"
                              onClick={() => {
                                updateModuleCustomization(item.id, {
                                  lucideIconName: ic.name,
                                  customImageUrl: undefined // clear image if picked icon
                                });
                                setIconPickerOpenFor(null);
                              }}
                              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#C8A45D] text-white shadow-[0_0_10px_rgba(255,90,0,0.5)] scale-105' 
                                  : 'bg-[#10283D] text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 border border-[#C8A45D]/20'
                              }`}
                              title={ic.label}
                            >
                              <IconComp className="w-5 h-5" />
                              <span className="text-[8px] font-mono truncate w-full text-center">
                                {ic.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action 2: Number Visibility & Custom Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    
                    {/* Toggle Show Number */}
                    <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-mono text-[#D7C08E] font-bold block">
                          Exibir Número (Tag)
                        </span>
                        <span className="text-[10px] text-[#B49A73]">
                          {dynamicRender.showNumber ? 'Visível no menu' : 'Oculto (sem número)'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateModuleCustomization(item.id, { showNumber: !dynamicRender.showNumber })}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          dynamicRender.showNumber ? 'bg-[#C8A45D]' : 'bg-[#0C1F31]'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-[#0C1F31]/90 transition-transform transform ${
                            dynamicRender.showNumber ? 'translate-x-6' : 'translate-x-1'
                          } top-1 absolute`}
                        />
                      </button>
                    </div>

                    {/* Custom Number Input */}
                    {dynamicRender.showNumber && (
                      <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 space-y-1">
                        <label className="block text-[11px] font-mono text-[#D7C08E] font-bold">
                          Número Personalizado:
                        </label>
                        <input
                          type="text"
                          placeholder={item.defaultNum || 'Ex: 01, 04, ★'}
                          value={cust.customNumber ?? ''}
                          onChange={(e) => updateModuleCustomization(item.id, { customNumber: e.target.value })}
                          className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#D8B56B]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Action 3: Custom Title Override */}
                  <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 space-y-1">
                    <label className="block text-[11px] font-mono text-[#D7C08E] font-bold flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-[#C8A45D]" />
                      Nome do Item no Menu (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder={item.defaultTitle}
                      value={cust.customTitle ?? ''}
                      onChange={(e) => updateModuleCustomization(item.id, { customTitle: e.target.value })}
                      className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#D8B56B]"
                    />
                  </div>

                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
