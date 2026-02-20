// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { parseRelativeDate } from './parseDate'

// Fixed reference date: 2026-02-20 (Friday)
const NOW = new Date('2026-02-20T12:00:00.000Z')

describe('parseRelativeDate', () => {
  describe('today / tomorrow', () => {
    it('parses "today"', () => {
      expect(parseRelativeDate('today', NOW)).toBe('2026-02-20')
    })

    it('parses "tomorrow"', () => {
      expect(parseRelativeDate('tomorrow', NOW)).toBe('2026-02-21')
    })

    it('parses "tom" as tomorrow', () => {
      expect(parseRelativeDate('tom', NOW)).toBe('2026-02-21')
    })
  })

  describe('weekday names — next occurrence (always future)', () => {
    // Today is Friday (2026-02-20). "fri" → next Friday (2026-02-27)
    it('parses "mon" → 2026-02-23', () => {
      expect(parseRelativeDate('mon', NOW)).toBe('2026-02-23')
    })

    it('parses "monday" → 2026-02-23', () => {
      expect(parseRelativeDate('monday', NOW)).toBe('2026-02-23')
    })

    it('parses "tue" → 2026-02-24', () => {
      expect(parseRelativeDate('tue', NOW)).toBe('2026-02-24')
    })

    it('parses "tuesday" → 2026-02-24', () => {
      expect(parseRelativeDate('tuesday', NOW)).toBe('2026-02-24')
    })

    it('parses "wed" → 2026-02-25', () => {
      expect(parseRelativeDate('wed', NOW)).toBe('2026-02-25')
    })

    it('parses "wednesday" → 2026-02-25', () => {
      expect(parseRelativeDate('wednesday', NOW)).toBe('2026-02-25')
    })

    it('parses "thu" → 2026-02-26', () => {
      expect(parseRelativeDate('thu', NOW)).toBe('2026-02-26')
    })

    it('parses "thursday" → 2026-02-26', () => {
      expect(parseRelativeDate('thursday', NOW)).toBe('2026-02-26')
    })

    it('parses "fri" → next Friday 2026-02-27 (not today)', () => {
      expect(parseRelativeDate('fri', NOW)).toBe('2026-02-27')
    })

    it('parses "friday" → next Friday 2026-02-27 (not today)', () => {
      expect(parseRelativeDate('friday', NOW)).toBe('2026-02-27')
    })

    it('parses "sat" → 2026-02-21', () => {
      expect(parseRelativeDate('sat', NOW)).toBe('2026-02-21')
    })

    it('parses "saturday" → 2026-02-21', () => {
      expect(parseRelativeDate('saturday', NOW)).toBe('2026-02-21')
    })

    it('parses "sun" → 2026-02-22', () => {
      expect(parseRelativeDate('sun', NOW)).toBe('2026-02-22')
    })

    it('parses "sunday" → 2026-02-22', () => {
      expect(parseRelativeDate('sunday', NOW)).toBe('2026-02-22')
    })
  })

  describe('month+day format', () => {
    it('parses "mar15" → 2026-03-15 (future this year)', () => {
      expect(parseRelativeDate('mar15', NOW)).toBe('2026-03-15')
    })

    it('parses "mar 15" with space → 2026-03-15', () => {
      expect(parseRelativeDate('mar 15', NOW)).toBe('2026-03-15')
    })

    it('parses "march15" full month name → 2026-03-15', () => {
      expect(parseRelativeDate('march15', NOW)).toBe('2026-03-15')
    })

    it('parses "jan10" → 2027-01-10 (already passed this year)', () => {
      expect(parseRelativeDate('jan10', NOW)).toBe('2027-01-10')
    })

    it('parses "jan 10" with space → 2027-01-10', () => {
      expect(parseRelativeDate('jan 10', NOW)).toBe('2027-01-10')
    })

    it('parses "february20" → 2027-02-20 (today, so next year)', () => {
      // "today" is handled by the today keyword; month+day for today's date goes next year
      expect(parseRelativeDate('february20', NOW)).toBe('2027-02-20')
    })
  })

  describe('exact ISO / slash dates', () => {
    it('parses "2026-03-15" exact ISO date', () => {
      expect(parseRelativeDate('2026-03-15', NOW)).toBe('2026-03-15')
    })

    it('parses "2026/03/15" slash date', () => {
      expect(parseRelativeDate('2026/03/15', NOW)).toBe('2026-03-15')
    })
  })

  describe('relative day/week offsets', () => {
    it('parses "3d" → 3 days from now', () => {
      expect(parseRelativeDate('3d', NOW)).toBe('2026-02-23')
    })

    it('parses "3days" → 3 days from now', () => {
      expect(parseRelativeDate('3days', NOW)).toBe('2026-02-23')
    })

    it('parses "3day" → 3 days from now', () => {
      expect(parseRelativeDate('3day', NOW)).toBe('2026-02-23')
    })

    it('parses "1w" → 1 week from now', () => {
      expect(parseRelativeDate('1w', NOW)).toBe('2026-02-27')
    })

    it('parses "1week" → 1 week from now', () => {
      expect(parseRelativeDate('1week', NOW)).toBe('2026-02-27')
    })

    it('parses "2w" → 2 weeks from now', () => {
      expect(parseRelativeDate('2w', NOW)).toBe('2026-03-06')
    })

    it('parses "2weeks" → 2 weeks from now', () => {
      expect(parseRelativeDate('2weeks', NOW)).toBe('2026-03-06')
    })
  })

  describe('invalid input', () => {
    it('returns null for empty string', () => {
      expect(parseRelativeDate('', NOW)).toBeNull()
    })

    it('returns null for unrecognised input', () => {
      expect(parseRelativeDate('foobar', NOW)).toBeNull()
    })

    it('returns null for invalid date "2026-13-01"', () => {
      expect(parseRelativeDate('2026-13-01', NOW)).toBeNull()
    })

    it('returns null for whitespace only', () => {
      expect(parseRelativeDate('   ', NOW)).toBeNull()
    })
  })

  describe('case insensitivity', () => {
    it('parses "Today" (capitalised)', () => {
      expect(parseRelativeDate('Today', NOW)).toBe('2026-02-20')
    })

    it('parses "MON" (uppercase)', () => {
      expect(parseRelativeDate('MON', NOW)).toBe('2026-02-23')
    })

    it('parses "MAR15" (uppercase)', () => {
      expect(parseRelativeDate('MAR15', NOW)).toBe('2026-03-15')
    })
  })
})
