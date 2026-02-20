// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { parseTaskInput } from './parseTaskInput'
import type { Context, Project } from '../../shared/types'

// Fixed reference date: 2026-02-20 (Friday)
const NOW = new Date('2026-02-20T12:00:00.000Z')

const CONTEXTS: Context[] = [
  {
    id: 'ctx-1',
    name: 'Work',
    color: null,
    icon: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 'ctx-2',
    name: 'Personal',
    color: null,
    icon: null,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
  },
]

const PROJECTS: Project[] = [
  {
    id: 'proj-1',
    title: 'Cortex',
    description: null,
    status: 'active',
    context_id: 'ctx-1',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    deleted_at: null,
  },
  {
    id: 'proj-2',
    title: 'Website',
    description: null,
    status: 'active',
    context_id: null,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    deleted_at: null,
  },
]

describe('parseTaskInput', () => {
  describe('context token (#)', () => {
    it('extracts context token from "Task #Work"', () => {
      const result = parseTaskInput('Task #Work', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.contextId).toBe('ctx-1')
      expect(result.raw.context).toBe('Work')
    })

    it('extracts context token at start "#Work do my task"', () => {
      const result = parseTaskInput('#Work do my task', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('do my task')
      expect(result.contextId).toBe('ctx-1')
      expect(result.raw.context).toBe('Work')
    })

    it('extracts context token at end "my task #Work"', () => {
      const result = parseTaskInput('my task #Work', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('my task')
      expect(result.contextId).toBe('ctx-1')
      expect(result.raw.context).toBe('Work')
    })

    it('ignores # in middle of a word "C#Work"', () => {
      const result = parseTaskInput('C#Work', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('C#Work')
      expect(result.contextId).toBeUndefined()
      expect(result.raw.context).toBeUndefined()
    })

    it('returns undefined contextId for unmatched context "Task #nonexistent"', () => {
      const result = parseTaskInput('Task #nonexistent', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.contextId).toBeUndefined()
      expect(result.raw.context).toBe('nonexistent')
    })

    it('fuzzy matches context by prefix "Task #wo" → Work', () => {
      const result = parseTaskInput('Task #wo', CONTEXTS, PROJECTS, NOW)
      expect(result.contextId).toBe('ctx-1')
      expect(result.raw.context).toBe('wo')
    })

    it('fuzzy matches context by contains "Task #ers" → Personal', () => {
      const result = parseTaskInput('Task #ers', CONTEXTS, PROJECTS, NOW)
      expect(result.contextId).toBe('ctx-2')
      expect(result.raw.context).toBe('ers')
    })

    it('matches context case-insensitively "Task #WORK"', () => {
      const result = parseTaskInput('Task #WORK', CONTEXTS, PROJECTS, NOW)
      expect(result.contextId).toBe('ctx-1')
    })
  })

  describe('project token (+)', () => {
    it('extracts project token from "Task +Cortex"', () => {
      const result = parseTaskInput('Task +Cortex', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.projectId).toBe('proj-1')
      expect(result.raw.project).toBe('Cortex')
    })

    it('returns undefined projectId for unmatched project "Task +nonexistent"', () => {
      const result = parseTaskInput('Task +nonexistent', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.projectId).toBeUndefined()
      expect(result.raw.project).toBe('nonexistent')
    })

    it('fuzzy matches project by prefix "Task +cor" → Cortex', () => {
      const result = parseTaskInput('Task +cor', CONTEXTS, PROJECTS, NOW)
      expect(result.projectId).toBe('proj-1')
      expect(result.raw.project).toBe('cor')
    })

    it('fuzzy matches project by contains "Task +site" → Website', () => {
      const result = parseTaskInput('Task +site', CONTEXTS, PROJECTS, NOW)
      expect(result.projectId).toBe('proj-2')
      expect(result.raw.project).toBe('site')
    })

    it('matches project case-insensitively "Task +CORTEX"', () => {
      const result = parseTaskInput('Task +CORTEX', CONTEXTS, PROJECTS, NOW)
      expect(result.projectId).toBe('proj-1')
    })
  })

  describe('when date token (do:)', () => {
    it('extracts when date from "Task do:tomorrow"', () => {
      const result = parseTaskInput('Task do:tomorrow', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.whenDate).toBe('2026-02-21')
      expect(result.raw.whenDate).toBe('tomorrow')
    })

    it('extracts when date from "Task do:mon"', () => {
      const result = parseTaskInput('Task do:mon', CONTEXTS, PROJECTS, NOW)
      expect(result.whenDate).toBe('2026-02-23')
      expect(result.raw.whenDate).toBe('mon')
    })

    it('extracts when date from "Task do:3d"', () => {
      const result = parseTaskInput('Task do:3d', CONTEXTS, PROJECTS, NOW)
      expect(result.whenDate).toBe('2026-02-23')
      expect(result.raw.whenDate).toBe('3d')
    })

    it('leaves whenDate undefined for unrecognised do: value', () => {
      const result = parseTaskInput('Task do:foobar', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.whenDate).toBeUndefined()
      expect(result.raw.whenDate).toBe('foobar')
    })
  })

  describe('deadline token (due:)', () => {
    it('extracts deadline from "Task due:friday"', () => {
      const result = parseTaskInput('Task due:friday', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.deadline).toBe('2026-02-27')
      expect(result.raw.deadline).toBe('friday')
    })

    it('extracts deadline from "Task due:2026-03-15"', () => {
      const result = parseTaskInput('Task due:2026-03-15', CONTEXTS, PROJECTS, NOW)
      expect(result.deadline).toBe('2026-03-15')
      expect(result.raw.deadline).toBe('2026-03-15')
    })

    it('leaves deadline undefined for unrecognised due: value', () => {
      const result = parseTaskInput('Task due:foobar', CONTEXTS, PROJECTS, NOW)
      expect(result.deadline).toBeUndefined()
      expect(result.raw.deadline).toBe('foobar')
    })
  })

  describe('multiple tokens', () => {
    it('handles all tokens together "Task #Work +Cortex do:tomorrow"', () => {
      const result = parseTaskInput('Task #Work +Cortex do:tomorrow', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.contextId).toBe('ctx-1')
      expect(result.projectId).toBe('proj-1')
      expect(result.whenDate).toBe('2026-02-21')
      expect(result.raw.context).toBe('Work')
      expect(result.raw.project).toBe('Cortex')
      expect(result.raw.whenDate).toBe('tomorrow')
    })

    it('handles all four tokens "Task #Work +Cortex do:tomorrow due:friday"', () => {
      const result = parseTaskInput('Task #Work +Cortex do:tomorrow due:friday', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Task')
      expect(result.contextId).toBe('ctx-1')
      expect(result.projectId).toBe('proj-1')
      expect(result.whenDate).toBe('2026-02-21')
      expect(result.deadline).toBe('2026-02-27')
    })
  })

  describe('title cleaning', () => {
    it('strips tokens from title with no double spaces', () => {
      const result = parseTaskInput('Do the thing #Work +Cortex', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('Do the thing')
      expect(result.title).not.toMatch(/\s{2,}/)
    })

    it('strips token at start cleanly', () => {
      const result = parseTaskInput('#Work task title', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('task title')
    })

    it('strips token at end cleanly', () => {
      const result = parseTaskInput('task title #Work', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('task title')
    })

    it('trims leading/trailing whitespace from title', () => {
      const result = parseTaskInput('  My task  #Work  ', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('My task')
    })
  })

  describe('empty input', () => {
    it('returns empty title and empty raw for empty string', () => {
      const result = parseTaskInput('', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('')
      expect(result.raw).toEqual({})
      expect(result.contextId).toBeUndefined()
      expect(result.projectId).toBeUndefined()
      expect(result.whenDate).toBeUndefined()
      expect(result.deadline).toBeUndefined()
    })

    it('returns empty title and empty raw for whitespace-only string', () => {
      const result = parseTaskInput('   ', CONTEXTS, PROJECTS, NOW)
      expect(result.title).toBe('')
      expect(result.raw).toEqual({})
    })
  })
})
