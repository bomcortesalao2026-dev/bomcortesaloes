import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

console.log('============================================================');
console.log('DIAGNÓSTICO COMPLETO - SUPABASE PERSISTÊNCIA & SINCRONIA');
console.log('============================================================\n');

const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const TABLES = ['users', 'system_config', 'filiais', 'funcoes', 'categorias_servicos', 'servicos', 'registros_servicos', 'vales', 'pagamentos_semanais', 'auditoria_logs'];

async function run() {
  console.log('>>> PASSO 1: VERIFICAÇÃO DE DADOS EXISTENTES (via SERVICE ROLE - bypass RLS) <<<\n');
  for (const t of TABLES) {
    try {
      const { data, error, count } = await serviceClient.from(t).select('*', { count: 'exact', head: false });
      if (error) {
        console.log(`  ❌ ${t.toUpperCase()} -> Erro: ${error.code} - ${error.message}`);
      } else {
        console.log(`  ✅ ${t.toUpperCase()} -> ${count} registro(s) encontrado(s)`);
        // Print relevant samples
        if (t === 'users' && data?.length) {
          data.forEach(u => console.log(`     → User: ${u.name} | email: ${u.email} | role: ${u.role} | status: ${u.status}`));
        }
        if (t === 'system_config' && data?.length) {
          const cfg = data[0];
          const custom = cfg.menu_customizations || {};
          console.log(`     → Nome rede: ${cfg.salon_network_name} | Ícones customizados: ${Object.keys(custom).length} item(ns)`);
          if (Object.keys(custom).length > 0) {
            Object.entries(custom).forEach(([k, v]) => console.log(`       • Menu "${k}": ${typeof v === 'object' && v?.iconType ? v.iconType : (typeof v === 'string' && v.startsWith('http') ? 'URL customizada' : JSON.stringify(v).slice(0,80))}`));
          }
        }
        if (t === 'filiais' && data?.length) {
          data.forEach(f => console.log(`     → Filial: ${f.name} | status: ${f.status} | ${f.city}/${f.state}`));
        }
      }
    } catch (e) {
      console.log(`  ❌ ${t.toUpperCase()} -> EXCEÇÃO: ${e.message}`);
    }
  }

  console.log('\n>>> PASSO 2: TESTE DE LEITURA VIA CHAVE ANÔNIMA (igual navegador) <<<\n');
  for (const t of TABLES) {
    try {
      const { error, count } = await anonClient.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  ❌ ANON READ ${t} -> Erro ${error.code}: ${error.message}`);
      } else {
        console.log(`  ✅ ANON READ ${t} -> OK (${count} registros)`);
      }
    } catch (e) {
      console.log(`  ❌ ANON READ ${t} -> EXCEÇÃO: ${e.message}`);
    }
  }

  console.log('\n>>> PASSO 3: TESTE DE GRAVAÇÃO VIA CHAVE ANÔNIMA (RLS - igual navegador) <<<\n');
  const TEST_USER = { id: 'teste-temp-diag', name: 'Teste Diag (remover)', email: 'teste.diag@remover.com', password_hash: '1234', role: 'VENDEDOR', status: 'INATIVO', created_at: new Date().toISOString() };
  try {
    const { error } = await anonClient.from('users').insert(TEST_USER);
    if (error) {
      console.log(`  ❌ ANON WRITE users -> FALHOU (RLS bloqueou!): ${error.code} - ${error.message}`);
      console.log('     → Isso explica por que o seed inicial falhou no console do navegador.');
    } else {
      console.log(`  ✅ ANON WRITE users -> SUCESSO (gravei usuário teste)`);
      await serviceClient.from('users').delete().eq('id', 'teste-temp-diag');
      console.log(`     → (Usuário teste já foi removido por segurança)`);
    }
  } catch (e) {
    console.log(`  ❌ ANON WRITE users -> EXCEÇÃO: ${e.message}`);
  }

  console.log('\n>>> PASSO 4: TESTE DE GRAVAÇÃO VIA SERVICE ROLE (controle) <<<\n');
  try {
    const TEST_USER2 = { ...TEST_USER, id: 'teste-temp-diag-2' };
    const { error } = await serviceClient.from('users').insert(TEST_USER2);
    if (error) {
      console.log(`  ❌ SERVICE WRITE users -> FALHOU: ${error.code} - ${error.message}`);
    } else {
      console.log(`  ✅ SERVICE WRITE users -> SUCESSO (gravação funciona!)`);
      await serviceClient.from('users').delete().eq('id', 'teste-temp-diag-2');
      console.log(`     → (Usuário teste já foi removido)`);
    }
  } catch (e) {
    console.log(`  ❌ SERVICE WRITE users -> EXCEÇÃO: ${e.message}`);
  }

  console.log('\n============================================================');
  console.log('CONCLUSÃO');
  console.log('============================================================');
}

run().catch(e => { console.error('FALHA GERAL:', e); process.exit(1); });
