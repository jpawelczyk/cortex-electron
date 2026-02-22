import { useEffect, useState } from 'react';
import { Bot, Plus, KeyRound } from 'lucide-react';
import { useStore } from '../stores';
import { Button } from '@renderer/components/ui/button';
import { CreateAgentDialog } from '@renderer/components/settings/CreateAgentDialog';

export function SettingsView() {
  const agents = useStore((s) => s.agents);
  const fetchAgents = useStore((s) => s.fetchAgents);
  const createAgent = useStore((s) => s.createAgent);
  const revokeAgent = useStore((s) => s.revokeAgent);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const activeAgents = agents.filter((a) => !a.revoked_at);
  const revokedAgents = agents.filter((a) => a.revoked_at);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold mb-6">Settings</h1>

        {/* AI Agents Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">AI Agents</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5 mr-1.5" />
              New Agent
            </Button>
          </div>

          {agents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Bot className="size-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-1">No AI agents yet</p>
              <p className="text-xs text-muted-foreground/70">
                Create an agent to generate an API key for AI access.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeAgents.map((agent) => (
                <AgentRow key={agent.id} agent={agent} onRevoke={() => revokeAgent(agent.id)} />
              ))}
              {revokedAgents.length > 0 && (
                <>
                  <div className="pt-2 pb-1">
                    <p className="text-xs text-muted-foreground/60 font-medium">Revoked</p>
                  </div>
                  {revokedAgents.map((agent) => (
                    <AgentRow key={agent.id} agent={agent} />
                  ))}
                </>
              )}
            </div>
          )}
        </section>
      </div>

      <CreateAgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateAgent={createAgent}
      />
    </div>
  );
}

interface AgentRowProps {
  agent: { id: string; name: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
  onRevoke?: () => void;
}

function AgentRow({ agent, onRevoke }: AgentRowProps) {
  const isRevoked = !!agent.revoked_at;

  return (
    <div className={`flex items-center justify-between rounded-lg border border-border p-3 ${isRevoked ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <Bot className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{agent.name}</span>
            {isRevoked && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                Revoked
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Created {new Date(agent.created_at).toLocaleDateString()}
            {agent.last_used_at && (
              <> &middot; Last used {new Date(agent.last_used_at).toLocaleDateString()}</>
            )}
          </p>
        </div>
      </div>
      {!isRevoked && onRevoke && (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onRevoke}>
          Revoke
        </Button>
      )}
    </div>
  );
}
