import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually to ensure it works smoothly in any shell
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        envVars[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.log('Error: Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
   console.log('Creando usuario Super Administrador: admin@salud360.com ...');
   
   const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@salud360.com',
      password: 'Password123!',
      email_confirm: true
   });

   let userId;

   if (error) {
       console.log('Aviso (Auth):', error.message);
       // Attempt to fetch it if it exists
       const { data: list } = await supabase.auth.admin.listUsers();
       const existing = list?.users?.find(u => u.email === 'admin@salud360.com');
       if (existing) userId = existing.id;
   } else {
       userId = data.user.id;
       console.log('✅ Creado en Auth: admin@salud360.com / Password123!');
   }

   if (userId) {
       const { error: dbError } = await supabase.from('users').upsert({
           id: userId,
           email: 'admin@salud360.com',
           role: 'Super Admin',
           active: true
       });
       if (dbError) {
           console.log('❌ Error insertando en base de datos public.users:', dbError.message);
       } else {
           console.log('✅ Permisos de Super Admin concedidos.');
       }
   }
}

main();
