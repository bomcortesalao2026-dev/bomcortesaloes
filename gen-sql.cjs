const fs = require('fs');
const sql = [
  '-- ============================================================',
  '-- DESATIVA RLS EM TODAS AS TABELAS - HABILITA GRAVACOES',
  '-- App usa chave anon com autenticacao propria (StorageService)',
  '-- ============================================================',
  'ALTER TABLE filiais DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE funcoes DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE categorias_servicos DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE servicos DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE users DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE registros_servicos DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE vales DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE pagamentos_semanais DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE auditoria_logs DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;',
  ''
].join('\n');
fs.mkdirSync('supabase/migrations', { recursive: true });
fs.writeFileSync('supabase/migrations/disable_rls_all_tables.sql', sql);
console.log('Arquivo criado com', sql.length, 'bytes');
console.log('Conteudo:\n' + sql);