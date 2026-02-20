import {
  Bold,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Link,
  Code,
  Copy,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onH1: () => void;
  onH2: () => void;
  onH3: () => void;
  onBulletList: () => void;
  onOrderedList: () => void;
  onTaskList: () => void;
  onLink: () => void;
  onCode: () => void;
  onCopy: () => void;
}

interface ToolbarButtonProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
}

function ToolbarButton({ icon: Icon, label, title, onClick, className }: ToolbarButtonProps) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
        className,
      )}
      title={title}
    >
      {Icon ? <Icon className="size-4" /> : label}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div
      data-testid="toolbar-divider"
      className="w-px h-4 bg-border mx-1"
    />
  );
}

export function EditorToolbar({
  onBold,
  onItalic,
  onH1,
  onH2,
  onH3,
  onBulletList,
  onOrderedList,
  onTaskList,
  onLink,
  onCode,
  onCopy,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border">
      <ToolbarButton icon={Bold} title="Bold" label="Bold" onClick={onBold} />
      <ToolbarButton icon={Italic} title="Italic" label="Italic" onClick={onItalic} />
      <ToolbarDivider />
      <ToolbarButton title="Heading 1" label="H1" onClick={onH1} />
      <ToolbarButton title="Heading 2" label="H2" onClick={onH2} />
      <ToolbarButton title="Heading 3" label="H3" onClick={onH3} />
      <ToolbarDivider />
      <ToolbarButton icon={List} title="Bullet list" label="Bullet list" onClick={onBulletList} />
      <ToolbarButton icon={ListOrdered} title="Numbered list" label="Numbered list" onClick={onOrderedList} />
      <ToolbarButton icon={ListTodo} title="Task list" label="Task list" onClick={onTaskList} />
      <ToolbarDivider />
      <ToolbarButton icon={Link} title="Link" label="Link" onClick={onLink} />
      <ToolbarButton icon={Code} title="Code block" label="Code block" onClick={onCode} />
      <ToolbarButton icon={Copy} title="Copy" label="Copy" onClick={onCopy} className="ml-auto" />
    </div>
  );
}
