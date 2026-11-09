/**
 * limpar-dados-demo.cjs
 * Remove todos os dados fictícios de demonstração do Supabase.
 * IDs de demo que serão removidos: gerente-1, gerente-2, user-vendedor-1..4, filial-1..3, func-1..5, svc-1..9
 * Usuários ADMIN reais (cadastrados pelo dono do salão) são PRESERVADOS.
 *
 * Execute com:  node limpar-dados-demo.cjs
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rrlggwudpawggaiicabz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SUPABASE_KEY) throw new Error('Defina SUPABASE_SERVICE_ROLE_KEY apenas no ambiente de execução deste script.');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DEMO_USER_IDS = ['gerente-1', 'gerente-2', 'user-vendedor-1', 'user-vendedor-2', 'user-vendedor-3', 'user-vendedor-4'];
const DEMO_FILIAL_IDS = ['filial-1', 'filial-2', 'filial-3'];
const DEMO_FUNCAO_IDS = ['func-1', 'func-2', 'func-3', 'func-4', 'func-5'];
const DEMO_SERVICO_IDS = ['svc-1', 'svc-2', 'svc-3', 'svc-4', 'svc-5', 'svc-6', 'svc-7', 'svc-8', 'svc-9'];

async function limpar() {
  console.log('\n Iniciando limpeza de dados de demonstracao no Supabase...\n');

  console.log('-> Removendo registros de servicos de usuarios demo...');
  for (const id of DEMO_USER_IDS) {
    const { error } = await supabase.from('registros_servicos').delete().eq('vendedor_id', id);
    if (error) console.warn(`  AVISO  registros_servicos vendedor ${id}:`, error.message);
  }

  console.log('-> Removendo vales de usuarios demo...');
  for (const id of DEMO_USER_IDS) {
    const { error } = await supabase.from('vales').delete().eq('vendedor_id', id);
    if (error) console.warn(`  AVISO  vales vendedor ${id}:`, error.message);
  }

  console.log('-> Removendo usuarios de demonstracao...');
  for (const id of DEMO_USER_IDS) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.warn(`  AVISO  user ${id}:`, error.message);
    else console.log(`  OK Usuario ${id} removido.`);
  }

  console.log('-> Removendo filiais de demonstracao...');
  for (const id of DEMO_FILIAL_IDS) {
    const { error } = await supabase.from('filiais').delete().eq('id', id);
    if (error) console.warn(`  AVISO  filial ${id}:`, error.message);
    else console.log(`  OK Filial ${id} removida.`);
  }

  console.log('-> Removendo funcoes de demonstracao...');
  for (const id of DEMO_FUNCAO_IDS) {
    const { error } = await supabase.from('funcoes').delete().eq('id', id);
    if (error) console.warn(`  AVISO  funcao ${id}:`, error.message);
    else console.log(`  OK Funcao ${id} removida.`);
  }

  console.log('-> Removendo servicos de demonstracao...');
  for (const id of DEMO_SERVICO_IDS) {
    const { error } = await supabase.from('servicos').delete().eq('id', id);
    if (error) console.warn(`  AVISO  servico ${id}:`, error.message);
    else console.log(`  OK Servico ${id} removido.`);
  }

  console.log('\nVerificando usuarios remanescentes...');
  const { data: remaining, error: listErr } = await supabase.from('users').select('id, name, email, role');
  if (listErr) {
    console.warn('AVISO: Nao foi possivel listar usuarios:', listErr.message);
  } else if (!remaining || remaining.length === 0) {
    console.log('  (Nenhum usuario no banco - cadastre o administrador pelo app)');
  } else {
    for (const u of remaining) {
      console.log(`  OK ${u.role}: ${u.name} <${u.email}>`);
    }
  }

  console.log('\nLimpeza concluida! Os dados ficticios foram removidos do Supabase.\n');
}

limpar().catch(err => {
  console.error('\nErro durante a limpeza:', err);
  process.exit(1);
});
