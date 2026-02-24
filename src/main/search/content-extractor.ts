import { createHash } from 'crypto';
import type { SearchableEntityType } from '@shared/search-types';
import type { Task, Note, Meeting, Project, Stakeholder } from '@shared/types';

type AnyEntity = Task | Note | Meeting | Project | Stakeholder;

/** Strip HTML tags from text */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

/** Strip basic markdown formatting */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // bold
    .replace(/\*(.*?)\*/g, '$1')        // italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/#{1,6}\s/g, '')           // headings
    .replace(/`(.*?)`/g, '$1')          // inline code
    .trim();
}

function cleanText(text: string | null): string | null {
  if (!text) return null;
  return stripMarkdown(stripHtml(text));
}

export function getEmbeddableText(entity: AnyEntity, entityType: SearchableEntityType): string {
  let fields: (string | null)[];

  switch (entityType) {
    case 'task': {
      const e = entity as Task;
      fields = [e.title, cleanText(e.notes)];
      break;
    }
    case 'note': {
      const e = entity as Note;
      fields = [e.title, cleanText(e.content)];
      break;
    }
    case 'meeting': {
      const e = entity as Meeting;
      fields = [e.title, e.location, cleanText(e.notes)];
      break;
    }
    case 'project': {
      const e = entity as Project;
      fields = [e.title, e.description];
      break;
    }
    case 'stakeholder': {
      const e = entity as Stakeholder;
      fields = [e.name, e.organization, e.role, cleanText(e.notes)];
      break;
    }
    default:
      fields = [];
  }

  return fields.filter(Boolean).join('\n\n');
}

export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function shouldChunk(text: string): boolean {
  return text.length > 500;
}

export function prepareForEmbedding(text: string, isQuery: boolean): string {
  return isQuery ? `query: ${text}` : `passage: ${text}`;
}
