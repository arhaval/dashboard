'use client';

/**
 * Add Member Button
 * Opens the add member modal (admin only)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { AddMemberModal } from './add-member-modal';

export function AddMemberButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {tr.team.addMember}
      </Button>
      <AddMemberModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
