/**
 * Script to create an admin user
 * Run with: npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  const email = 'admin@arhaval.com';
  const password = 'Admin123!';
  const fullName = 'Admin User';

  console.log('Creating admin user...');

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    return;
  }

  console.log('Auth user created:', authData.user.id);

  // Create user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: 'ADMIN',
      is_active: true,
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating user profile:', userError.message);
    return;
  }

  console.log('User profile created:', userData);
  console.log('\n-----------------------------------');
  console.log('Admin user created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('-----------------------------------\n');
}

createAdminUser();
