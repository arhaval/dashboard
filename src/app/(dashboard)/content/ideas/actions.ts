'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { specialPostService } from '@/services';
import type { PostStatus, UpdateSpecialPostInput } from '@/types';

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');
  return profile as { id: string; role: string };
}

async function requireAdmin() {
  const profile = await requireAuth();
  if (profile.role !== 'ADMIN') redirect('/');
  return profile;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createPostAction(formData: FormData) {
  const profile = await requireAuth();

  const platforms = formData.getAll('platforms') as string[];
  const result = await specialPostService.create(
    {
      title:        formData.get('title') as string,
      platforms,
      content_type: formData.get('content_type') as string,
      caption:      (formData.get('caption') as string) || undefined,
    },
    profile.id,
  );

  if (result.error) throw new Error(result.error);
  revalidatePath('/content/ideas');
}

export async function updatePostStatusAction(id: string, status: PostStatus) {
  await requireAdmin();
  const result = await specialPostService.updateStatus(id, status);
  if (result.error) throw new Error(result.error);
  revalidatePath('/content/ideas');
}

export async function updatePostAction(id: string, input: UpdateSpecialPostInput) {
  await requireAuth();
  const result = await specialPostService.update(id, input);
  if (result.error) throw new Error(result.error);
  revalidatePath('/content/ideas');
}

export async function deletePostAction(id: string) {
  await requireAdmin();
  const result = await specialPostService.delete(id);
  if (result.error) throw new Error(result.error);
  revalidatePath('/content/ideas');
}

export async function assignEditorAction(postId: string, editorId: string | null) {
  await requireAdmin();
  const result = await specialPostService.update(postId, { editor_id: editorId });
  if (result.error) throw new Error(result.error);
  revalidatePath('/content/ideas');
}

export async function assignDesignerAction(postId: string, designerId: string | null) {
  await requireAdmin();
  const result = await specialPostService.update(postId, { designer_id: designerId });
  if (result.error) throw new Error(result.error);
  revalidatePath('/content/ideas');
}
