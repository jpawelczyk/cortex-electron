export interface ChunkOptions {
  maxTokens: number;
  overlapTokens: number;
  minChunkSize: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  maxTokens: 256,
  overlapTokens: 50,
  minChunkSize: 100,
};

export function chunkText(text: string, options: ChunkOptions = DEFAULT_CHUNK_OPTIONS): string[] {
  // Rough approximation: 1 token ≈ 4 chars for mixed EN/DE
  const maxChars = options.maxTokens * 4; // 1024
  const overlapChars = options.overlapTokens * 4; // 200

  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    if (end < text.length) {
      // Try paragraph break first
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      const sentenceBreak = text.lastIndexOf('. ', end);

      if (paragraphBreak > start + maxChars / 2) {
        end = paragraphBreak + 2;
      } else if (sentenceBreak > start + maxChars / 2) {
        end = sentenceBreak + 2;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlapChars;
  }

  return chunks.filter(c => c.length >= options.minChunkSize);
}
