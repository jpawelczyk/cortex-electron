import { useState, useRef } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onH1: () => void;
  onH2: () => void;
  onH3: () => void;
  onBulletList: () => void;
  onOrderedList: () => void;
  onTaskList: () => void;
  onLink: (url: string) => void;
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
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleLinkSubmit() {
    const url = linkUrl.trim();
    if (url) {
      onLink(url);
    }
    setLinkUrl('');
    setLinkOpen(false);
  }

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
      <Popover open={linkOpen} onOpenChange={(open) => {
        setLinkOpen(open);
        if (!open) setLinkUrl('');
      }}>
        <PopoverTrigger asChild>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setLinkOpen(true)}
            className="p-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Link"
            data-testid="link-toolbar-button"
          >
            <Link className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-72 p-2"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <input
            ref={inputRef}
            data-testid="link-url-input"
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLinkSubmit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setLinkUrl('');
                setLinkOpen(false);
              }
            }}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        </PopoverContent>
      </Popover>
      <ToolbarButton icon={Code} title="Code block" label="Code block" onClick={onCode} />
      <ToolbarButton icon={Copy} title="Copy" label="Copy" onClick={onCopy} className="ml-auto" />
    </div>
  );
}
