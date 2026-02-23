import { useState } from 'react';
import { useStore } from '../stores';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface StakeholderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stakeholder?: { id: string; name: string; organization?: string | null; role?: string | null; email?: string | null; phone?: string | null; notes?: string | null };
}

export function StakeholderModal({ open, onOpenChange, stakeholder }: StakeholderModalProps) {
  const createStakeholder = useStore(s => s.createStakeholder);
  const updateStakeholder = useStore(s => s.updateStakeholder);
  const selectStakeholder = useStore(s => s.selectStakeholder);

  const [name, setName] = useState(stakeholder?.name ?? '');
  const [organization, setOrganization] = useState(stakeholder?.organization ?? '');
  const [role, setRole] = useState(stakeholder?.role ?? '');
  const [email, setEmail] = useState(stakeholder?.email ?? '');
  const [phone, setPhone] = useState(stakeholder?.phone ?? '');
  const [notes, setNotes] = useState(stakeholder?.notes ?? '');

  const isEdit = !!stakeholder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEdit) {
      await updateStakeholder(stakeholder.id, {
        name: name.trim(),
        organization: organization.trim() || null,
        role: role.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });
    } else {
      const created = await createStakeholder({
        name: name.trim(),
        organization: organization.trim() || undefined,
        role: role.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (created?.id) {
        selectStakeholder(created.id);
      }
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setOrganization('');
    setRole('');
    setEmail('');
    setPhone('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Stakeholder' : 'Add Stakeholder'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name *"
            className="w-full text-sm bg-accent/30 border border-border/40 rounded-md px-3 py-2 outline-none focus:border-border text-foreground placeholder:text-muted-foreground/50"
            autoFocus
            required
            data-testid="modal-stakeholder-name"
          />
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Organization"
            className="w-full text-sm bg-accent/30 border border-border/40 rounded-md px-3 py-2 outline-none focus:border-border text-foreground placeholder:text-muted-foreground/50"
            data-testid="modal-stakeholder-org"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role / Title"
            className="w-full text-sm bg-accent/30 border border-border/40 rounded-md px-3 py-2 outline-none focus:border-border text-foreground placeholder:text-muted-foreground/50"
            data-testid="modal-stakeholder-role"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full text-sm bg-accent/30 border border-border/40 rounded-md px-3 py-2 outline-none focus:border-border text-foreground placeholder:text-muted-foreground/50"
            data-testid="modal-stakeholder-email"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full text-sm bg-accent/30 border border-border/40 rounded-md px-3 py-2 outline-none focus:border-border text-foreground placeholder:text-muted-foreground/50"
            data-testid="modal-stakeholder-phone"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={3}
            className="w-full text-sm bg-accent/30 border border-border/40 rounded-md px-3 py-2 outline-none focus:border-border text-foreground placeholder:text-muted-foreground/50 resize-none"
            data-testid="modal-stakeholder-notes"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { onOpenChange(false); resetForm(); }}
              className="text-sm px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              data-testid="modal-stakeholder-submit"
            >
              {isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
