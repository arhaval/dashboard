import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Check auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  console.log('Auth users:');
  authUsers?.users?.forEach(u => console.log(`  - ${u.id}: ${u.email}`));

  // Check users table
  const { data: dbUsers, error } = await supabase.from('users').select('*');
  console.log('\nDB users:');
  if (error) {
    console.log('  Error:', error.message);
  } else if (dbUsers?.length === 0) {
    console.log('  No users in database');
  } else {
    dbUsers?.forEach(u => console.log(`  - ${u.id}: ${u.email} (${u.role})`));
  }
}

check();
