import { createClient } from '@supabase/supabase-js';

// Test with anon key (like browser would)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Test with service key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  // Sign in as admin user
  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email: 'admin@arhaval.com',
    password: 'Admin123!',
  });

  if (signInError) {
    console.log('Sign in error:', signInError.message);
    return;
  }

  console.log('Signed in as:', signInData.user?.email);
  console.log('User ID:', signInData.user?.id);

  // Try to fetch user profile with anon client (subject to RLS)
  const { data: profile, error: profileError } = await supabaseAnon
    .from('users')
    .select('*')
    .eq('id', signInData.user?.id)
    .single();

  if (profileError) {
    console.log('\nRLS Error when fetching profile:', profileError.message);
    console.log('Error details:', profileError);
  } else {
    console.log('\nProfile fetched successfully:', profile);
  }

  // Also test with service key (should always work)
  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', signInData.user?.id)
    .single();

  if (adminError) {
    console.log('\nAdmin query error:', adminError.message);
  } else {
    console.log('\nAdmin query result:', adminProfile);
  }
}

test();
