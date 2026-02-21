import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Link,
  Code,
  Copy,
  Quote,
  Minus,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const setLink = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const copyContent = () => {
    const md = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.storage as any).markdown.getMarkdown();
    navigator.clipboard.writeText(md);
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-card/40">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        icon={Bold}
        label="Bold"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        icon={Italic}
        label="Italic"
      />

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        label="H1"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        label="H2"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        label="H3"
      />

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        icon={List}
        label="Bullet list"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        icon={ListOrdered}
        label="Numbered list"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')}
        icon={ListTodo}
        label="Task list"
      />

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        icon={Quote}
        label="Quote"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        icon={Code}
        label="Code block"
      />
      <ToolbarButton
        onClick={setLink}
        active={editor.isActive('link')}
        icon={Link}
        label="Link"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        icon={Minus}
        label="Divider"
      />

      <div className="ml-auto">
        <ToolbarButton onClick={copyContent} icon={Copy} label="Copy markdown" />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-1.5 rounded text-xs font-medium transition-colors',
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
      title={label}
    >
      {Icon ? <Icon className="size-4" /> : label}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}
