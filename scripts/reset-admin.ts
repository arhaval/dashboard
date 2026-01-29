import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetAdmin() {
  // Delete existing admin user
  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users?.find(u => u.email === 'admin@arhaval.com');

  if (adminUser) {
    console.log('Deleting existing admin user...');
    await supabase.from('users').delete().eq('id', adminUser.id);
    await supabase.auth.admin.deleteUser(adminUser.id);
  }

  // Create new admin user
  console.log('Creating new admin user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@arhaval.com',
    password: 'Admin123!',
    email_confirm: true,
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }

  console.log('Auth user created:', authData.user.id);

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: 'admin@arhaval.com',
      full_name: 'Admin User',
      role: 'ADMIN',
      is_active: true,
    });

  if (profileError) {
    console.error('Profile error:', profileError.message);
    return;
  }

  console.log('\n========================================');
  console.log('Admin user created successfully!');
  console.log('Email: admin@arhaval.com');
  console.log('Password: Admin123!');
  console.log('========================================\n');
}

resetAdmin();
