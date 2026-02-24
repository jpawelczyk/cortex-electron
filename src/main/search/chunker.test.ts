import { describe, it, expect } from 'vitest';
import { chunkText, DEFAULT_CHUNK_OPTIONS } from './chunker';

describe('chunkText', () => {
  it('returns empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(chunkText('   \n  ')).toEqual([]);
  });

  it('returns single-element array for short text (< maxChars)', () => {
    const text = 'This is a short text.';
    const result = chunkText(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it('returns single chunk for text exactly at maxChars boundary', () => {
    const maxChars = DEFAULT_CHUNK_OPTIONS.maxTokens * 4;
    const text = 'a'.repeat(maxChars);
    const result = chunkText(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it('splits long text into multiple chunks', () => {
    const maxChars = DEFAULT_CHUNK_OPTIONS.maxTokens * 4;
    const text = 'a'.repeat(maxChars * 3);
    const result = chunkText(text);
    expect(result.length).toBeGreaterThan(1);
  });

  it('chunks have overlap (last chars of chunk N appear at start of chunk N+1)', () => {
    const maxChars = DEFAULT_CHUNK_OPTIONS.maxTokens * 4;
    const overlapChars = DEFAULT_CHUNK_OPTIONS.overlapTokens * 4;
    // Build text long enough to produce multiple chunks, no natural breaks
    const text = 'x'.repeat(maxChars * 2 + 100);
    const result = chunkText(text);
    expect(result.length).toBeGreaterThan(1);
    // The tail of chunk 0 should appear at the start of chunk 1
    const tailOfFirst = result[0].slice(-overlapChars);
    expect(result[1].startsWith(tailOfFirst)).toBe(true);
  });

  it('prefers breaking at paragraph boundaries (\\n\\n)', () => {
    const maxChars = DEFAULT_CHUNK_OPTIONS.maxTokens * 4;
    // Place a paragraph break just before maxChars
    const paraBreakPos = Math.floor(maxChars * 0.75);
    const part1 = 'a'.repeat(paraBreakPos);
    const part2 = 'b'.repeat(maxChars); // long enough to force a second chunk
    const text = part1 + '\n\n' + part2;
    const result = chunkText(text);
    expect(result.length).toBeGreaterThan(1);
    // First chunk should end with the paragraph break content, not cut through part2
    expect(result[0]).not.toContain('b');
  });

  it("falls back to sentence boundaries ('. ')", () => {
    const maxChars = DEFAULT_CHUNK_OPTIONS.maxTokens * 4;
    // Place a sentence break just before maxChars, no paragraph breaks
    const sentenceBreakPos = Math.floor(maxChars * 0.75);
    const part1 = 'a'.repeat(sentenceBreakPos - 2) + '. ';
    const part2 = 'b'.repeat(maxChars);
    const text = part1 + part2;
    const result = chunkText(text);
    expect(result.length).toBeGreaterThan(1);
    // First chunk should end at the sentence break, not contain 'b's
    expect(result[0]).not.toContain('b');
  });

  it('filters out chunks smaller than minChunkSize', () => {
    const options = { ...DEFAULT_CHUNK_OPTIONS, minChunkSize: 100 };
    const maxChars = options.maxTokens * 4;
    const overlapChars = options.overlapTokens * 4;
    // Create text where last chunk would be tiny
    const text = 'a'.repeat(maxChars) + 'b'.repeat(10);
    const result = chunkText(text, options);
    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThanOrEqual(options.minChunkSize);
    }
  });

  it('custom options override defaults', () => {
    const customOptions = {
      maxTokens: 10,      // 40 chars
      overlapTokens: 2,   // 8 chars
      minChunkSize: 5,
    };
    const text = 'a'.repeat(100);
    const result = chunkText(text, customOptions);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(customOptions.maxTokens * 4);
    }
  });
});
