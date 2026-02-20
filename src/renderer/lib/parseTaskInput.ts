import type { Context, Project } from '../../shared/types'
import { parseRelativeDate } from './parseDate'

export interface ParsedTask {
  title: string
  contextId?: string
  projectId?: string
  whenDate?: string
  deadline?: string
  raw: {
    context?: string
    project?: string
    whenDate?: string
    deadline?: string
  }
}

// Tokens must be preceded by start-of-string or whitespace
const CONTEXT_REGEX = /(?:^|\s)#(\S+)/g
const PROJECT_REGEX = /(?:^|\s)\+(\S+)/g
const WHEN_REGEX = /(?:^|\s)do:(\S+)/g
const DUE_REGEX = /(?:^|\s)due:(\S+)/g

/** Exact → prefix → contains, case-insensitive */
function fuzzyMatch(
  query: string,
  items: { id: string; name: string }[]
): { id: string; name: string } | null {
  const q = query.toLowerCase()

  const exact = items.find((i) => i.name.toLowerCase() === q)
  if (exact) return exact

  const prefix = items.find((i) => i.name.toLowerCase().startsWith(q))
  if (prefix) return prefix

  const contains = items.find((i) => i.name.toLowerCase().includes(q))
  if (contains) return contains

  return null
}

/**
 * Parses a raw task input string and extracts structured tokens.
 *
 * @param input     Raw user input
 * @param contexts  Available contexts for matching
 * @param projects  Available projects for matching
 * @param now       Reference date (defaults to new Date()). Pass a fixed date in tests.
 */
export function parseTaskInput(
  input: string,
  contexts: Context[],
  projects: Project[],
  now: Date = new Date()
): ParsedTask {
  const raw: ParsedTask['raw'] = {}
  let title = input.trim()

  // Helper: extract the first match value and strip that token from title
  function extractFirst(regex: RegExp): string | undefined {
    regex.lastIndex = 0
    const match = regex.exec(title)
    if (!match) return undefined
    const value = match[1]
    // Remove the matched segment (preserve leading space if needed)
    const fullMatch = match[0]
    // If match starts with whitespace, the leading whitespace belongs to the separator —
    // replace the full match with a single space (so surrounding words don't merge).
    // If match starts at position 0 (no leading space), replace with empty string.
    if (fullMatch.startsWith(' ') || fullMatch.startsWith('\t')) {
      title = title.replace(fullMatch, ' ')
    } else {
      title = title.replace(fullMatch, '')
    }
    // Strip any duplicate spaces and trim
    title = title.replace(/\s{2,}/g, ' ').trim()
    return value
  }

  // Extract context (#)
  const contextRaw = extractFirst(CONTEXT_REGEX)
  if (contextRaw !== undefined) {
    raw.context = contextRaw
  }

  // Extract project (+)
  const projectRaw = extractFirst(PROJECT_REGEX)
  if (projectRaw !== undefined) {
    raw.project = projectRaw
  }

  // Extract when date (do:)
  const whenRaw = extractFirst(WHEN_REGEX)
  if (whenRaw !== undefined) {
    raw.whenDate = whenRaw
  }

  // Extract deadline (due:)
  const dueRaw = extractFirst(DUE_REGEX)
  if (dueRaw !== undefined) {
    raw.deadline = dueRaw
  }

  const result: ParsedTask = { title, raw }

  // Resolve context
  if (raw.context !== undefined) {
    const match = fuzzyMatch(raw.context, contexts)
    if (match) result.contextId = match.id
  }

  // Resolve project (map title → name for fuzzy matching)
  if (raw.project !== undefined) {
    const projectItems = projects.map((p) => ({ id: p.id, name: p.title }))
    const match = fuzzyMatch(raw.project, projectItems)
    if (match) result.projectId = match.id
  }

  // Resolve when date
  if (raw.whenDate !== undefined) {
    const parsed = parseRelativeDate(raw.whenDate, now)
    if (parsed) result.whenDate = parsed
  }

  // Resolve deadline
  if (raw.deadline !== undefined) {
    const parsed = parseRelativeDate(raw.deadline, now)
    if (parsed) result.deadline = parsed
  }

  return result
}
