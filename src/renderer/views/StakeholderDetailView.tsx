import { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Check, X, Mail, Phone, Building2, Briefcase } from 'lucide-react';
import { useStore } from '../stores';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

interface StakeholderDetailViewProps {
  stakeholderId: string;
}

export function StakeholderDetailView({ stakeholderId }: StakeholderDetailViewProps) {
  const stakeholders = useStore((s) => s.stakeholders);
  const updateStakeholder = useStore((s) => s.updateStakeholder);
  const deleteStakeholder = useStore((s) => s.deleteStakeholder);
  const deselectStakeholder = useStore((s) => s.deselectStakeholder);

  const stakeholder = stakeholders.find((s) => s.id === stakeholderId);

  const [name, setName] = useState(stakeholder?.name ?? '');
  const [organization, setOrganization] = useState(stakeholder?.organization ?? '');
  const [role, setRole] = useState(stakeholder?.role ?? '');
  const [email, setEmail] = useState(stakeholder?.email ?? '');
  const [phone, setPhone] = useState(stakeholder?.phone ?? '');
  const [notes, setNotes] = useState(stakeholder?.notes ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (stakeholder) {
      setName(stakeholder.name);
      setOrganization(stakeholder.organization ?? '');
      setRole(stakeholder.role ?? '');
      setEmail(stakeholder.email ?? '');
      setPhone(stakeholder.phone ?? '');
      setNotes(stakeholder.notes ?? '');
    }
  }, [stakeholderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { debouncedFn: debouncedSaveName } = useDebouncedCallback(
    (v: string) => updateStakeholder(stakeholderId, { name: v }),
    500,
  );
  const { debouncedFn: debouncedSaveOrg } = useDebouncedCallback(
    (v: string) => updateStakeholder(stakeholderId, { organization: v || null }),
    500,
  );
  const { debouncedFn: debouncedSaveRole } = useDebouncedCallback(
    (v: string) => updateStakeholder(stakeholderId, { role: v || null }),
    500,
  );
  const { debouncedFn: debouncedSaveEmail } = useDebouncedCallback(
    (v: string) => updateStakeholder(stakeholderId, { email: v || null }),
    500,
  );
  const { debouncedFn: debouncedSavePhone } = useDebouncedCallback(
    (v: string) => updateStakeholder(stakeholderId, { phone: v || null }),
    500,
  );
  const { debouncedFn: debouncedSaveNotes } = useDebouncedCallback(
    (v: string) => updateStakeholder(stakeholderId, { notes: v || null }),
    500,
  );

  if (!stakeholder) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Stakeholder not found</p>
      </div>
    );
  }

  const initials = stakeholder.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-12 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={deselectStakeholder}
            data-testid="back-to-stakeholders"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Stakeholders
          </button>
          <div className="flex items-center gap-2">
            {confirmingDelete ? (
              <div className="flex items-center gap-1 rounded-lg bg-accent px-2 py-1">
                <span className="text-xs text-muted-foreground mr-1">Delete?</span>
                <button
                  data-testid="confirm-delete"
                  onClick={async () => { await deleteStakeholder(stakeholderId); deselectStakeholder(); }}
                  className="p-0.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                >
                  <Check className="size-3" />
                </button>
                <button
                  data-testid="cancel-delete"
                  onClick={() => setConfirmingDelete(false)}
                  className="p-0.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                data-testid="delete-stakeholder"
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold shrink-0">
            {initials}
          </div>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); debouncedSaveName(e.target.value); }}
            className="flex-1 text-2xl font-bold bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/50"
            placeholder="Name"
            data-testid="stakeholder-name-input"
          />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="size-4 text-muted-foreground shrink-0" />
            <input
              value={organization}
              onChange={(e) => { setOrganization(e.target.value); debouncedSaveOrg(e.target.value); }}
              className="flex-1 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/50"
              placeholder="Organization"
              data-testid="stakeholder-org-input"
            />
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="size-4 text-muted-foreground shrink-0" />
            <input
              value={role}
              onChange={(e) => { setRole(e.target.value); debouncedSaveRole(e.target.value); }}
              className="flex-1 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/50"
              placeholder="Role / Title"
              data-testid="stakeholder-role-input"
            />
          </div>
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground shrink-0" />
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); debouncedSaveEmail(e.target.value); }}
              className="flex-1 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/50"
              placeholder="Email"
              type="email"
              data-testid="stakeholder-email-input"
            />
          </div>
          <div className="flex items-center gap-3">
            <Phone className="size-4 text-muted-foreground shrink-0" />
            <input
              value={phone}
              onChange={(e) => { setPhone(e.target.value); debouncedSavePhone(e.target.value); }}
              className="flex-1 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/50"
              placeholder="Phone"
              data-testid="stakeholder-phone-input"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6">
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); debouncedSaveNotes(e.target.value); }}
            placeholder="Notes..."
            rows={4}
            className="w-full bg-transparent text-sm text-foreground border border-border/40 rounded-lg px-3 py-2 outline-none focus:border-border resize-none placeholder:text-muted-foreground/50"
            data-testid="stakeholder-notes-input"
          />
        </div>
      </div>
    </div>
  );
}
