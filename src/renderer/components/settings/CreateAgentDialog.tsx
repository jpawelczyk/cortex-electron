import { useState } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAgent: (name: string) => Promise<string>;
}

export function CreateAgentDialog({ open, onOpenChange, onCreateAgent }: CreateAgentDialogProps) {
  const [name, setName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const key = await onCreateAgent(name.trim());
      setGeneratedKey(key);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setName('');
      setGeneratedKey(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{generatedKey ? 'API Key Created' : 'New AI Agent'}</DialogTitle>
          <DialogDescription>
            {generatedKey
              ? 'Copy your API key now. It will not be shown again.'
              : 'Create an API key for an AI agent to access your data.'}
          </DialogDescription>
        </DialogHeader>

        {!generatedKey ? (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g. Claude, GPT Assistant"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
              <code className="flex-1 text-sm break-all font-mono">{generatedKey}</code>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3">
              <AlertTriangle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                This key will only be shown once. Store it securely.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedKey ? (
            <Button onClick={handleCreate} disabled={!name.trim() || creating}>
              {creating ? 'Creating...' : 'Create Agent'}
            </Button>
          ) : (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
