import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Sparkles, 
  Upload, 
  Video, 
  Image as ImageIcon, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Building2, 
  RotateCcw,
  Scissors,
  HelpCircle,
  Film,
  Menu,
  DatabaseBackup,
  KeyRound,
  Eye,
  EyeOff,
  Download,
  CalendarClock,
  ShieldCheck,
  Palette
} from 'lucide-react';
import { User, SystemConfig, MenuItemCustomization, Filial, Funcao, Servico, RegistroServico, Vale, PagamentoSemanal, AuditoriaLog } from '../types';
import { StorageService } from '../services/storage';
import { SalonLogo } from './SalonLogo';
import { MenuIconCustomizer } from './MenuIconCustomizer';
import { calculateWeekCycle } from '../utils/dateCycleUtils';
import { AuditoriaModule } from './AuditoriaModule';

type ConfigTab = 'GERAL' | 'IDENTIDADE' | 'AUDITORIA';

interface ConfiguracoesModuleProps {
  currentUser: User;
  onConfigUpdated?: (config: SystemConfig) => void;
}

interface BackupRestoreData {
  usuarios: User[];
  filiais: Filial[];
  funcoes: Funcao[];
  servicos: Servico[];
  registrosServicos: RegistroServico[];
  vales: Vale[];
  pagamentos: PagamentoSemanal[];
  auditoria: AuditoriaLog[];
  config: SystemConfig;
}

export const ConfiguracoesModule: React.FC<ConfiguracoesModuleProps> = ({ 
  currentUser,
  onConfigUpdated 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<SystemConfig>(StorageService.getConfig());
  
  const [salonNetworkName, setSalonNetworkName] = useState<string>(config.salonNetworkName || 'Bom Corte Salões');
  const [slogan, setSlogan] = useState<string>(config.slogan || 'Rede de Alta Performance & Gestão de Salões');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(config.logoUrl);
  const [logoType, setLogoType] = useState<'image' | 'video' | undefined>(config.logoType);
  const [closingDayOfWeek, setClosingDayOfWeek] = useState<string>(config.closingDayOfWeek || 'Segunda-feira');
  const [autoApproveByManager, setAutoApproveByManager] = useState<boolean>(config.autoApproveByManager ?? true);
  const [menuCustomizations, setMenuCustomizations] = useState<Record<string, MenuItemCustomization>>(
    config.menuCustomizations || {}
  );
  const [backupEnabled, setBackupEnabled] = useState<boolean>(config.backupEnabled ?? true);
  const [backupFrequency, setBackupFrequency] = useState<'SEMANAL' | 'MENSAL'>(config.backupFrequency || 'SEMANAL');
  const [lastBackupAt, setLastBackupAt] = useState<string | undefined>(config.lastBackupAt || '');
  const [nextBackupAt, setNextBackupAt] = useState<string | undefined>(config.nextBackupAt || '');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isZerarModalOpen, setIsZerarModalOpen] = useState<boolean>(false);
  const [isClearingHistory, setIsClearingHistory] = useState<boolean>(false);
  const [pendingBackup, setPendingBackup] = useState<{ name: string; data: BackupRestoreData } | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>('GERAL');

  useEffect(() => {
    const currentCfg = StorageService.getConfig();
    setConfig(currentCfg);
    setSalonNetworkName(currentCfg.salonNetworkName || 'Bom Corte Salões');
    setSlogan(currentCfg.slogan || 'Rede de Alta Performance & Gestão de Salões');
    setLogoUrl(currentCfg.logoUrl);
    setLogoType(currentCfg.logoType);
    setClosingDayOfWeek(currentCfg.closingDayOfWeek || 'Segunda-feira');
    setAutoApproveByManager(currentCfg.autoApproveByManager ?? true);
    setMenuCustomizations(currentCfg.menuCustomizations || {});
    setBackupEnabled(currentCfg.backupEnabled ?? true);
    setBackupFrequency(currentCfg.backupFrequency || 'SEMANAL');
    setLastBackupAt(currentCfg.lastBackupAt || '');
    setNextBackupAt(currentCfg.nextBackupAt || '');
  }, []);

  const getNextBackupDate = (baseDate = new Date(), frequency = backupFrequency) => {
    if (frequency === 'MENSAL') {
      const next = new Date(baseDate);
      next.setDate(next.getDate() + 30);
      return next.toISOString();
    }

    const cicloAtual = calculateWeekCycle(baseDate);
    const fechamentoAtual = new Date(cicloAtual.endDate);
    fechamentoAtual.setHours(23, 59, 59, 999);
    if (fechamentoAtual > baseDate) return fechamentoAtual.toISOString();

    const proximaReferencia = new Date(fechamentoAtual.getTime() + 1);
    const proximoFechamento = new Date(calculateWeekCycle(proximaReferencia).endDate);
    proximoFechamento.setHours(23, 59, 59, 999);
    return proximoFechamento.toISOString();
  };

  const formatDateDisplay = (value?: string) => {
    if (!value) return 'Ainda não foi gerado';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Ainda não foi gerado';
    const cycle = calculateWeekCycle(date);
    const dateTime = date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    return `${cycle.formattedLabel} · ${dateTime}`;
  };

  const handleCreateBackup = () => {
    const now = new Date();
    const ciclo = calculateWeekCycle(now);
    const payload = {
      exportadoEm: now.toISOString(),
      rede: StorageService.getConfig().salonNetworkName,
      cicloSemanal: {
        rotulo: ciclo.formattedLabel,
        inicio: ciclo.startDateStr,
        fim: ciclo.endDateStr,
      },
      usuarios: StorageService.getUsers(),
      filiais: StorageService.getFiliais(),
      funcoes: StorageService.getFuncoes(),
      servicos: StorageService.getServicos(),
      registrosServicos: StorageService.getRegistrosServicos(),
      vales: StorageService.getVales(),
      pagamentos: StorageService.getPagamentos(),
      auditoria: StorageService.getAuditoria(),
      config: StorageService.getConfig(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-bomcorte-${ciclo.startDateStr}-a-${ciclo.endDateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const updatedConfig: SystemConfig = {
      ...config,
      backupEnabled,
      backupFrequency,
      lastBackupAt: now.toISOString(),
      nextBackupAt: getNextBackupDate(now, backupFrequency),
    };

    StorageService.saveConfig(updatedConfig, currentUser);
    setConfig(updatedConfig);
    setLastBackupAt(updatedConfig.lastBackupAt);
    setNextBackupAt(updatedConfig.nextBackupAt);
    setSuccessMessage('Backup exportado com sucesso. O arquivo JSON foi baixado e o agendamento semanal foi atualizado.');
  };

  const handleBackupFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setSuccessMessage('');
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object') throw new Error('O arquivo não contém um backup válido.');
      const data = parsed as Partial<BackupRestoreData>;
      const arrayFields: (keyof BackupRestoreData)[] = [
        'usuarios', 'filiais', 'funcoes', 'servicos', 'registrosServicos', 'vales', 'pagamentos', 'auditoria',
      ];
      if (arrayFields.some(field => !Array.isArray(data[field]))) {
        throw new Error('Este JSON não possui todas as listas esperadas de um backup Bom Corte.');
      }
      if (!data.config || typeof data.config !== 'object' || typeof data.config.salonNetworkName !== 'string') {
        throw new Error('O backup está sem as configurações da rede.');
      }
      setPendingBackup({ name: file.name, data: data as BackupRestoreData });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Não foi possível ler o arquivo de backup.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRestoreBackup = async () => {
    if (!pendingBackup || isRestoringBackup) return;
    setIsRestoringBackup(true);
    setUploadError('');
    try {
      await StorageService.restoreBackup(pendingBackup.data, currentUser);
      setConfig(pendingBackup.data.config);
      onConfigUpdated?.(pendingBackup.data.config);
      setPendingBackup(null);
      setSuccessMessage('Backup restaurado com sucesso. O sistema será recarregado com os dados restaurados.');
      window.dispatchEvent(new CustomEvent('nexus_config_updated'));
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setUploadError(error instanceof Error
        ? `A restauração não foi concluída: ${error.message}`
        : 'A restauração não foi concluída. Verifique a conexão e tente novamente.');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // Handle file selection (Image or MP4 Video)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');
    if (!file) return;

    // Check type
    const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setUploadError('Formato inválido. Por favor, selecione uma imagem (PNG, JPG, SVG, WebP) ou um vídeo MP4.');
      return;
    }

    // Limit size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('O arquivo selecionado é muito grande. O limite máximo é de 15MB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoUrl(result);
      setLogoType(isVideo ? 'video' : 'image');
      setIsUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Erro ao processar o arquivo selecionado.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(undefined);
    setLogoType(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setUploadError('');

    if (!salonNetworkName.trim()) {
      setUploadError('O nome do salão/rede é obrigatório.');
      return;
    }

    const updatedConfig: SystemConfig = {
      ...config,
      salonNetworkName: salonNetworkName.trim(),
      slogan: slogan.trim(),
      logoUrl,
      logoType,
      closingDayOfWeek,
      autoApproveByManager,
      menuCustomizations,
      backupEnabled,
      backupFrequency,
      lastBackupAt: lastBackupAt || config.lastBackupAt,
      nextBackupAt: nextBackupAt || config.nextBackupAt,
    };

    StorageService.saveConfig(updatedConfig, currentUser);
    setConfig(updatedConfig);
    setSuccessMessage('Configurações e identidade visual salvas com sucesso!');

    if (onConfigUpdated) {
      onConfigUpdated(updatedConfig);
    }

    // Trigger storage event so other components refresh immediately
    window.dispatchEvent(new CustomEvent('nexus_config_updated'));
  };

  const previewConfig: SystemConfig = {
    ...config,
    salonNetworkName: salonNetworkName.trim() || 'Bom Corte Salões',
    slogan: slogan.trim() || 'Rede de Alta Performance & Gestão de Salões',
    logoUrl,
    logoType,
    backupEnabled,
    backupFrequency,
    lastBackupAt,
    nextBackupAt,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#D7C08E] mb-1">
            <Settings className="w-4 h-4 text-[#C8A45D]" />
            <span>PAINEL DO ADMINISTRADOR // CUSTOMIZAÇÃO & MARCA</span>
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
          Configurações da Rede & Identidade Visual
        </h2>
        <p className="text-xs text-[#B49A73] mt-0.5">
          Personalize o nome do salão, insira logotipos em imagem ou <strong>vídeo dinâmico em MP4</strong> e ajuste os parâmetros operacionais da rede.
        </p>
      </div>

      {/* Tabs */}
      <div className="p-1.5 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex flex-wrap gap-1.5">
        {([
          ['GERAL', 'GERAL', 'Parâmetros, Backup, Senhas & Manutenção', Settings],
          ['IDENTIDADE', 'IDENT. VISUAL', 'Logo, Vídeo & Ícones do Menu', Palette],
          ['AUDITORIA', 'AUDITORIA', 'Trilha de Segurança & Logs', ShieldCheck],
        ] as [ConfigTab, string, string, React.FC<{ className?: string }>][]).map(([id, label, sub, Icon]) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex-1 min-w-[160px] flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#C8A45D]/30 to-[#16344C] border-2 border-[#C8A45D]/70 shadow-[0_0_20px_rgba(255,90,0,0.25)]'
                  : 'border-2 border-transparent hover:bg-[#10283D]/60 hover:border-[#C8A45D]/20'
              }`}
            >
              <div className={`flex items-center justify-center w-9 h-9 rounded-xl border ${
                isActive
                  ? 'bg-[#C8A45D]/20 border-[#C8A45D]/50 text-[#F1DEB5]'
                  : 'bg-black/30 border-[#C8A45D]/15 text-[#D7C08E]'
              }`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className={`text-[11px] font-black uppercase tracking-wider ${
                  isActive ? 'text-[#F1DEB5]' : 'text-white/75'
                }`}>
                  {label}
                </div>
                <div className={`text-[10px] font-mono truncate ${
                  isActive ? 'text-[#E8D6B5]/90' : 'text-white/50'
                }`}>
                  {sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500 text-rose-200 text-xs flex items-center gap-3 shadow-[0_0_20px_rgba(225,29,72,0.3)]">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {activeTab === 'AUDITORIA' ? (
        <AuditoriaModule currentUser={currentUser} />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* ============= ABA: IDENTIDADE VISUAL ============= */}
          {activeTab === 'IDENTIDADE' && (
            <>
              {/* SECTION 1: Brand & Logo Customization */}
              <div className="p-6 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-5">
                <div className="flex items-center justify-between border-b border-[#C8A45D]/20 pb-3">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C8A45D]" />
                    Identidade Visual & Logotipo (Suporte a Imagem e Vídeo MP4)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C8A45D]/20 text-[#F1DEB5] border border-[#C8A45D]/30">
                    {logoType === 'video' ? 'LOGO EM MP4 VÍDEO' : logoUrl ? 'LOGO EM IMAGEM' : 'PADRÃO'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Form Fields */}
                  <div className="space-y-4 text-xs">
                    
                    {/* Salon Name */}
                    <div>
                      <label className="block text-[#D7C08E] font-mono font-bold mb-1">
                        Nome do Salão / Rede *
                      </label>
                      <input
                        type="text"
                        value={salonNetworkName}
                        onChange={(e) => setSalonNetworkName(e.target.value)}
                        placeholder="Ex: Nexus Beauty Prime, Studio Glamour..."
                        required
                        className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-[#D8B56B] font-semibold text-sm"
                      />
                      <p className="text-[10px] text-[#B49A73] mt-1">
                        Este nome aparecerá em todas as telas, cabeçalhos, recibos e relatórios.
                      </p>
                    </div>

                    {/* Slogan */}
                    <div>
                      <label className="block text-[#D7C08E] font-mono font-bold mb-1">
                        Slogan ou Subtítulo
                      </label>
                      <input
                        type="text"
                        value={slogan}
                        onChange={(e) => setSlogan(e.target.value)}
                        placeholder="Ex: Rede de Alta Performance & Beleza"
                        className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-[#D8B56B]"
                      />
                    </div>

                    {/* Upload Input for Image or MP4 */}
                    <div className="space-y-2 pt-2">
                      <label className="block text-[#D7C08E] font-mono font-bold">
                        Carregar Arquivo de Logo (Imagem ou Vídeo MP4):
                      </label>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif, video/mp4, video/webm"
                        className="hidden"
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A45D]/20 to-[#16344C] border-2 border-[#C8A45D]/50 hover:border-[#D9B76C] text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,90,0,0.2)] active:scale-95"
                        >
                          <Upload className="w-4 h-4 text-[#D8B56B]" />
                          <span>{isUploading ? 'Processando...' : 'Buscar Arquivo no Computador (MP4 / Imagem)'}</span>
                        </button>

                        {logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-500/50 hover:bg-rose-900/60 text-rose-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Remover logotipo e voltar ao padrão"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 text-[11px] text-[#E8D6B5]/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-[#F1DEB5] font-bold">
                          <Film className="w-3.5 h-3.5 text-[#C8A45D]" />
                          <span>Suporte a Vídeo MP4 em Loop:</span>
                        </div>
                        <p>
                          Você pode escolher um vídeo <strong>.mp4</strong> animado para criar um logotipo futurista com movimento contínuo na barra lateral e cabeçalho.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Live Preview Box */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#122B41] via-[#100502] to-[#050201] border-2 border-[#C8A45D]/40 shadow-[0_0_30px_rgba(255,90,0,0.2)] flex flex-col items-center justify-center text-center space-y-4">
                    <div className="text-[11px] font-mono text-[#D7C08E] uppercase tracking-wider font-bold">
                      PRÉ-VISUALIZAÇÃO EM TEMPO REAL
                    </div>

                    {/* Logo Preview Container */}
                    <div className="p-4 rounded-2xl bg-black/60 border border-[#C8A45D]/30 flex flex-col items-center justify-center min-w-[200px] min-h-[140px]">
                      <SalonLogo
                        size="xl"
                        overrideConfig={previewConfig}
                      />
                      
                      <div className="mt-3">
                        <div className="font-bold text-white text-base uppercase tracking-wider">
                          {previewConfig.salonNetworkName}
                        </div>
                        <div className="text-[10px] font-mono text-[#D7C08E] uppercase">
                          // {previewConfig.slogan}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-[#B49A73]">
                      {logoType === 'video' ? '🎬 Vídeo MP4 animado ativo' : logoUrl ? '🖼️ Logotipo de imagem ativo' : '✂️ Logotipo padrão do sistema ativo'}
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 2: Menu Icons & Navigation Customizer */}
              <MenuIconCustomizer
                config={{
                  ...config,
                  menuCustomizations
                }}
                onChange={(updatedCustomizations) => {
                  setMenuCustomizations(updatedCustomizations);
                }}
                currentUser={currentUser}
              />
            </>
          )}

          {/* ============= ABA: GERAL ============= */}
          {activeTab === 'GERAL' && (
            <>
              {/* SECTION 3: Operational Parameters */}
              <div className="p-6 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-4">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-[#C8A45D]/20 pb-3">
                  <Building2 className="w-4 h-4 text-[#C8A45D]" />
                  Parâmetros Financeiros & Fechamentos
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[#D7C08E] font-mono mb-1">
                      Dia de Fechamento Semanal das Comissões
                    </label>
                    <select
                      value={closingDayOfWeek}
                      onChange={(e) => setClosingDayOfWeek(e.target.value)}
                      className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D8B56B]"
                    >
                      <option value="Segunda-feira">Segunda-feira</option>
                      <option value="Terça-feira">Terça-feira</option>
                      <option value="Quarta-feira">Quarta-feira</option>
                      <option value="Quinta-feira">Quinta-feira</option>
                      <option value="Sexta-feira">Sexta-feira</option>
                      <option value="Sábado">Sábado</option>
                      <option value="Domingo">Domingo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D7C08E] font-mono mb-1">
                      Aprovação de Serviços pelos Gerentes de Filial
                    </label>
                    <select
                      value={autoApproveByManager ? 'MANUAL' : 'AUTO'}
                      onChange={(e) => setAutoApproveByManager(e.target.value === 'MANUAL')}
                      className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D8B56B]"
                    >
                      <option value="MANUAL">Exigir validação manual do gerente da filial</option>
                      <option value="AUTO">Aprovação imediata automática</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Backup e Credenciais */}
              <div className="p-6 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-5">
                <div className="flex items-center justify-between border-b border-[#C8A45D]/20 pb-3">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <DatabaseBackup className="w-4 h-4 text-[#C8A45D]" />
                    Backup Semanal & Restauro Rápido
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C8A45D]/20 text-[#F1DEB5] border border-[#C8A45D]/30">
                    EXPORTAÇÃO JSON
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-3 p-4 rounded-2xl bg-black/30 border border-[#C8A45D]/20">
                    <label className="flex items-center justify-between gap-3 text-[#D7C08E] font-mono font-bold">
                      <span>Ativar backup automático</span>
                      <input
                        type="checkbox"
                        checked={backupEnabled}
                        onChange={(e) => setBackupEnabled(e.target.checked)}
                        className="h-4 w-4 accent-[#C8A45D]"
                      />
                    </label>

                    <div>
                      <label className="block text-[#D7C08E] font-mono mb-1">Frequência</label>
                      <select
                        value={backupFrequency}
                        onChange={(e) => setBackupFrequency(e.target.value as 'SEMANAL' | 'MENSAL')}
                        className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D8B56B]"
                      >
                        <option value="SEMANAL">Semanal</option>
                        <option value="MENSAL">Mensal</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-2xl bg-black/30 border border-[#C8A45D]/20">
                    <div className="flex items-center gap-2 text-[#D7C08E] font-mono font-bold">
                      <CalendarClock className="w-4 h-4 text-[#C8A45D]" />
                      <span>Agenda de backup</span>
                    </div>
                    <div className="text-[11px] text-[#E8D6B5]">
                      <div className="flex justify-between gap-3 py-1 border-b border-[#C8A45D]/10">
                        <span className="text-[#B49A73] shrink-0">Ciclo atual:</span>
                        <span className="text-right">{calculateWeekCycle(new Date()).formattedLabel}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#C8A45D]/10">
                        <span className="text-[#B49A73]">Último backup:</span>
                        <span>{formatDateDisplay(lastBackupAt)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#B49A73]">Próximo backup:</span>
                        <span>{formatDateDisplay(nextBackupAt)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateBackup}
                      className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A45D]/20 to-[#16344C] border-2 border-[#C8A45D]/50 hover:border-[#D9B76C] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,90,0,0.2)] active:scale-95"
                    >
                      <Download className="w-4 h-4 text-[#D8B56B]" />
                      <span>Fazer Backup Agora</span>
                    </button>
                    <input
                      ref={backupInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleBackupFileSelected}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backupInputRef.current?.click()}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-[#C8A45D]/40 hover:border-[#D9B76C] text-[#F1DEB5] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Restaurar de arquivo JSON</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-4">
                <div className="flex items-center justify-between border-b border-[#C8A45D]/20 pb-3">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#C8A45D]" />
                    Senhas de Acesso // Funcionários, Gerentes e Administradores
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#C8A45D]/20 text-[#F1DEB5] border border-[#C8A45D]/30 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPasswords ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#C8A45D]/20">
                  <table className="w-full text-left text-[11px] text-white">
                    <thead className="bg-[#10283D] text-[#D7C08E] font-mono uppercase">
                      <tr>
                        <th className="py-3 px-3">Nome</th>
                        <th className="py-3 px-3">Perfil</th>
                        <th className="py-3 px-3">E-mail</th>
                        <th className="py-3 px-3">Senha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C8A45D]/10">
                      {StorageService.getUsers()
                        .filter(u => ['ADMIN', 'GERENTE', 'VENDEDOR'].includes(u.role))
                        .map((user) => (
                          <tr key={user.id} className="hover:bg-[#C8A45D]/5">
                            <td className="py-2.5 px-3 font-bold text-[#F1DEB5]">{user.name}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                                user.role === 'ADMIN'
                                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                                  : user.role === 'GERENTE'
                                  ? 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
                                  : 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-300'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[#E8D6B5]">{user.email}</td>
                            <td className="py-2.5 px-3 font-mono text-[#F1DEB5]">
                              {showPasswords ? user.passwordHash : '••••••••'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 3: Maintenance & Clear History */}
              <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-4">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                  <h3 className="text-sm font-bold text-rose-200 font-mono flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    Banco de Dados // Zerar Histórico de Atendimentos & Comissões
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    AÇÃO ADMINISTRATIVA
                  </span>
                </div>

                <p className="text-xs text-[#B49A73]">
                  Esta opção zera todo o histórico de lançamentos (atendimentos realizados, comissões, vales/adiantamentos, pagamentos semanais e logs), permitindo iniciar a operação do salão do absoluto zero. Os cadastros de filiais, serviços e usuários são preservados.
                </p>

                <div>
                  <button
                    type="button"
                    id="btn-abrir-zerar-historico"
                    onClick={() => setIsZerarModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/60 border-2 border-rose-500/60 hover:bg-rose-900/80 text-rose-200 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.2)] active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Zerar Todo o Histórico de Atendimentos & Vales Agora</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] hover:brightness-110 text-white font-black text-sm shadow-[0_0_25px_rgba(255,90,0,0.5)] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Save className="w-5 h-5" />
              <span>Salvar Todas as Configurações</span>
            </button>
          </div>

        </form>
      )}

      {/* Confirmation Modal for Zerar Histórico */}
      {isZerarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0C2032] border-2 border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.4)] relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              Zerar Todo o Histórico do Salão?
            </h3>

            <p className="text-xs text-[#E8D6B5]/90 leading-relaxed mb-6">
              Você está prestes a apagar <strong>todos os atendimentos lançados, comissões de funcionários, vales/adiantamentos e pagamentos semanais</strong>.
              <br/><br/>
              <span className="text-emerald-400 font-bold">✓ Os cadastros de filiais, funcionários, cargos e catálogo de serviços NÃO serão apagados.</span>
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                id="btn-cancelar-zerar-historico"
                onClick={() => setIsZerarModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-black/50 border border-[#C8A45D]/30 hover:border-[#C8A45D] text-[#E8D6B5] text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirmar-zerar-historico"
                disabled={isClearingHistory}
                onClick={async () => {
                  setIsClearingHistory(true);
                  setUploadError('');
                  try {
                    await StorageService.clearAllHistory(currentUser);
                    setIsZerarModalOpen(false);
                    setSuccessMessage('Banco de dados zerado com sucesso. O histórico foi removido do sistema e das filiais.');
                    window.dispatchEvent(new CustomEvent('nexus_config_updated'));
                  } catch (error) {
                    setUploadError(error instanceof Error ? error.message : 'Não foi possível apagar o histórico.');
                  } finally {
                    setIsClearingHistory(false);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-wait"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isClearingHistory ? 'Apagando histórico...' : 'Sim, Zerar Histórico Agora'}</span>
              </button>
            </div>
            {uploadError && <p className="mt-3 text-xs text-rose-300">{uploadError}</p>}
          </div>
        </div>
      )}

      {pendingBackup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#0C2032] border-2 border-amber-500/50 p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Confirmar restauração do backup?</h3>
                <p className="text-xs text-[#D7C08E] break-all">Arquivo: {pendingBackup.name}</p>
              </div>
            </div>
            <p className="text-xs text-[#E8D6B5] leading-relaxed mb-4">
              Os dados atuais serão substituídos pelos dados deste arquivo{` `}
              {`(incluindo o banco online quando conectado ao Supabase)`}.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 text-center text-[10px] font-mono">
              {[
                ['Usuários', pendingBackup.data.usuarios.length],
                ['Filiais', pendingBackup.data.filiais.length],
                ['Atendimentos', pendingBackup.data.registrosServicos.length],
                ['Pagamentos', pendingBackup.data.pagamentos.length],
              ].map(([label, count]) => (
                <div key={label} className="rounded-lg bg-black/30 border border-[#C8A45D]/20 p-2 text-[#F1DEB5]">
                  <strong className="block text-sm">{count}</strong>{label}
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                disabled={isRestoringBackup}
                onClick={() => setPendingBackup(null)}
                className="px-4 py-2 rounded-xl bg-black/40 border border-[#C8A45D]/30 text-[#E8D6B5] text-xs font-bold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestoringBackup}
                onClick={handleRestoreBackup}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-black disabled:opacity-50"
              >
                {isRestoringBackup ? 'Restaurando...' : 'Substituir e restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
