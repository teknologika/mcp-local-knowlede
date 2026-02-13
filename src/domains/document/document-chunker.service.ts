import { Docling } from 'docling-sdk';
import type { DocumentChunk, ChunkingOptions, ChunkMetadata } from './document.types.js';
import type { ChunkType } from '../../shared/types/index.js';
import { createLogger } from '../../shared/logging/index.js';

const logger = createLogger('info').child('DocumentChunkerService');

/**
 * Service for chunking documents using HybridChunker with fallback
 */
export class DocumentChunkerService {
  private docling: Docling;

  constructor(options: { outputDir?: string } = {}) {
    this.docling = new Docling({
      cli: {
        outputDir: options.outputDir || './temp',
      },
    });
  }

  /**
   * Chunk a document using HybridChunker with fallback to simple chunking
   */
  /**
     * Chunk a document using structure-aware chunking with fallback
     * For markdown/text: Uses heading detection and recursive splitting
     * For other formats: Use chunkWithDocling for best results
     */
    async chunkDocument(
      content: string,
      options: ChunkingOptions = {}
    ): Promise<DocumentChunk[]> {
      const maxTokens = options.maxTokens || 512;
      const chunkSize = options.chunkSize || 2000; // Optimized for Xenova/all-MiniLM-L6-v2
      const chunkOverlap = options.chunkOverlap || 400; // ~100 tokens overlap

      logger.info('Starting document chunking (structure-aware)', { 
        maxTokens, 
        contentLength: content.length,
        chunkSize,
        chunkOverlap
      });

      // Use structure-aware chunking for text/markdown
      return this.structureAwareChunking(content, chunkSize, chunkOverlap);
    }

  /**
   * Chunk a document using Docling document object (from conversion)
   */
  async chunkWithDocling(
    doclingDoc: any,
    options: ChunkingOptions = {}
  ): Promise<DocumentChunk[]> {
    const maxTokens = options.maxTokens || 512;

    logger.info('Chunking with Docling document object', { maxTokens });

    try {
      // Use docling-sdk's chunking with the document object
      const result = await this.docling.chunk(doclingDoc, {
        max_tokens: maxTokens,
        chunker_type: 'hybrid',
        merge_peers: options.mergePeers !== false,
      });

      const chunks = this.processHybridChunks(result.chunks || []);
      logger.info('Docling chunking completed successfully', { chunkCount: chunks.length });
      return chunks;
    } catch (error) {
      logger.warn('Docling chunking failed, falling back to structure-aware chunking');
      // Extract text from docling document for fallback
      const content = this.extractTextFromDocling(doclingDoc);
      return this.structureAwareChunking(
        content,
        options.chunkSize || 2000,
        options.chunkOverlap || 400
      );
    }
  }

  /**
   * Process chunks from HybridChunker
   */
  private processHybridChunks(hybridChunks: any[]): DocumentChunk[] {
    return hybridChunks.map((chunk, index) => {
      const content = chunk.text || chunk.content || '';
      const chunkType = this.detectChunkType(chunk);
      const headingPath = this.extractHeadingPath(chunk);

      // Validate and use token count from chunk, or estimate if invalid
      let tokenCount = chunk.token_count;
      if (typeof tokenCount !== 'number' || tokenCount < 0 || isNaN(tokenCount)) {
        tokenCount = this.estimateTokenCount(content);
      }

      const metadata: ChunkMetadata = {
        chunkType,
        hasContext: true,
        headingPath: headingPath.length > 0 ? headingPath : undefined,
        pageNumber: chunk.page_number,
      };

      return {
        content,
        index,
        tokenCount,
        metadata,
      };
    });
  }

  /**
   * Detect chunk type from HybridChunker metadata
   */
  private detectChunkType(chunk: any): ChunkType {
    const type = chunk.type?.toLowerCase() || '';
    
    if (type.includes('table')) return 'table';
    if (type.includes('heading') || type.includes('title')) return 'heading';
    if (type.includes('section')) return 'section';
    if (type.includes('list')) return 'list';
    if (type.includes('code')) return 'code';
    
    return 'paragraph';
  }

  /**
   * Extract heading hierarchy from chunk metadata
   */
  private extractHeadingPath(chunk: any): string[] {
    if (chunk.heading_path && Array.isArray(chunk.heading_path)) {
      return chunk.heading_path;
    }
    
    if (chunk.headings && Array.isArray(chunk.headings)) {
      return chunk.headings;
    }
    
    if (chunk.section_hierarchy && Array.isArray(chunk.section_hierarchy)) {
      return chunk.section_hierarchy;
    }
    
    return [];
  }

  /**
   * Extract text content from Docling document object
   */
  private extractTextFromDocling(doclingDoc: any): string {
    if (typeof doclingDoc === 'string') {
      return doclingDoc;
    }
    
    if (doclingDoc.text) {
      return doclingDoc.text;
    }
    
    if (doclingDoc.content) {
      return doclingDoc.content;
    }
    
    // Try to extract from markdown
    if (doclingDoc.markdown) {
      return doclingDoc.markdown;
    }
    
    return '';
  }

  /**
   * Fallback to simple text chunking
   */
  /**
     * Structure-aware chunking for markdown and plain text
     * Detects headings and splits intelligently
     */
    private structureAwareChunking(
      content: string,
      chunkSize: number,
      chunkOverlap: number
    ): DocumentChunk[] {
      if (!content || content.trim().length === 0) {
        return [];
      }

      // Detect document structure (markdown or plain text headings)
      const headings = this.detectHeadings(content);

      if (headings.length > 0) {
        logger.info('Detected document structure', { headingCount: headings.length });
        return this.chunkByHeadings(content, headings, chunkSize, chunkOverlap);
      }

      // No headings found, use recursive splitting
      logger.info('No headings detected, using recursive splitting');
      return this.recursiveChunking(content, chunkSize, chunkOverlap);
    }

    /**
     * Detect headings in markdown and plain text
     */
    private detectHeadings(content: string): Array<{
      line: string;
      index: number;
      level: number;
      position: number;
    }> {
      const lines = content.split('\n');
      const headings: Array<{line: string; index: number; level: number; position: number}> = [];
      let position = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prevLine = i > 0 ? lines[i - 1] : '';
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

        // Pattern 1: Markdown headers (# ## ###)
        const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (mdMatch) {
          headings.push({
            line: mdMatch[2].trim(),
            index: i,
            level: mdMatch[1].length,
            position
          });
          position += line.length + 1;
          continue;
        }

        // Pattern 2: Underlined headers (=== or ---)
        if (prevLine.trim().length > 0 && prevLine.trim().length < 100) {
          if (line.trim().match(/^={3,}$/)) {
            headings.push({
              line: prevLine.trim(),
              index: i - 1,
              level: 1,
              position: position - prevLine.length - 1
            });
          } else if (line.trim().match(/^-{3,}$/)) {
            headings.push({
              line: prevLine.trim(),
              index: i - 1,
              level: 2,
              position: position - prevLine.length - 1
            });
          }
        }

        // Pattern 3: ALL CAPS headings (3-60 chars)
        if (
          line.trim().length >= 3 &&
          line.trim().length <= 60 &&
          /^[A-Z][A-Z\s\d:'-]{2,}$/.test(line.trim()) &&
          !/^\d+$/.test(line.trim()) && // Not just numbers
          !/^[A-Z\s]+\d+[A-Z\s]*$/.test(line.trim()) && // Not just letters and numbers mixed
          prevLine.trim() === '' && // After blank line
          nextLine.trim().length > 0 &&
          !/^[=-]{3,}$/.test(nextLine.trim()) // Not an underline marker
        ) {
          headings.push({
            line: line.trim(),
            index: i,
            level: 1,
            position
          });
        }

        // Pattern 4: Numbered sections (1. Introduction, 1.1 Overview)
        // Matches: "1. Text", "1.1 Text", "2. Text"
        const numberedMatch = line.match(/^(\d+(?:\.\d+)*\.?)\s+([A-Z].{2,60})$/);
        if (numberedMatch) {
          const dots = (numberedMatch[1].match(/\./g) || []).length;
          const level = Math.min(dots, 6);
          headings.push({
            line: numberedMatch[2].trim(),
            index: i,
            level,
            position
          });
        }

        // Pattern 5: Chapter/Section/Part markers
        const sectionMatch = line.match(/^(Chapter|Section|Part|Article)\s+(\d+|[IVX]+):?\s*(.*)$/i);
        if (sectionMatch) {
          headings.push({
            line: sectionMatch[3] || `${sectionMatch[1]} ${sectionMatch[2]}`,
            index: i,
            level: 1,
            position
          });
        }

        position += line.length + 1;
      }

      return headings;
    }

    /**
     * Chunk content by detected headings
     */
    private chunkByHeadings(
      content: string,
      headings: Array<{line: string; index: number; level: number; position: number}>,
      chunkSize: number,
      chunkOverlap: number
    ): DocumentChunk[] {
      const chunks: DocumentChunk[] = [];
      const lines = content.split('\n');

      // Create sections based on headings
      const sections: Array<{
        heading: string;
        level: number;
        startLine: number;
        endLine: number;
        content: string;
      }> = [];

      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];
        const startLine = heading.index;
        const endLine = nextHeading ? nextHeading.index - 1 : lines.length - 1;

        const sectionContent = lines.slice(startLine, endLine + 1).join('\n');
        sections.push({
          heading: heading.line,
          level: heading.level,
          startLine,
          endLine,
          content: sectionContent
        });
      }

      // Process each section
      let chunkIndex = 0;
      for (const section of sections) {
        // If section is small enough, keep it as one chunk
        if (section.content.length <= chunkSize) {
          const metadata: ChunkMetadata = {
            chunkType: 'section',
            hasContext: true,
            headingPath: [section.heading]
          };

          chunks.push({
            content: section.content,
            index: chunkIndex++,
            tokenCount: this.estimateTokenCount(section.content),
            metadata
          });
        } else {
          // Section too large, split recursively while preserving heading
          const subChunks = this.recursiveChunking(
            section.content,
            chunkSize,
            chunkOverlap
          );

          // Add heading context to all sub-chunks
          for (const subChunk of subChunks) {
            chunks.push({
              ...subChunk,
              index: chunkIndex++,
              metadata: {
                ...subChunk.metadata,
                headingPath: [section.heading]
              }
            });
          }
        }
      }

      logger.info('Heading-based chunking completed', { 
        chunkCount: chunks.length,
        sectionCount: sections.length
      });
      return chunks;
    }

    /**
     * Recursive chunking with intelligent separators
     * Tries to split on natural boundaries (paragraphs, sentences, words)
     */
    private recursiveChunking(
      content: string,
      chunkSize: number,
      chunkOverlap: number
    ): DocumentChunk[] {
      // Separators in order of preference
      const separators = [
        '\n\n',   // Paragraph breaks
        '\n',     // Line breaks
        '. ',     // Sentence breaks
        '! ',     // Exclamation sentences
        '? ',     // Question sentences
        '; ',     // Semicolon breaks
        ', ',     // Comma breaks
        ' ',      // Word breaks
        ''        // Character breaks (last resort)
      ];

      return this.recursiveSplit(content, chunkSize, chunkOverlap, separators, 0);
    }

    /**
     * Recursive splitting implementation
     */
    private recursiveSplit(
      text: string,
      chunkSize: number,
      chunkOverlap: number,
      separators: string[],
      separatorIndex: number
    ): DocumentChunk[] {
      if (!text || text.trim().length === 0) {
        return [];
      }

      const chunks: DocumentChunk[] = [];
      const separator = separators[separatorIndex];

      // If we're at the last separator (empty string), do character splitting
      if (separatorIndex >= separators.length - 1) {
        return this.characterSplit(text, chunkSize, chunkOverlap);
      }

      // Split by current separator
      const splits = separator ? text.split(separator) : [text];

      let currentChunk = '';
      let chunkIndex = 0;

      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        const splitWithSep = i < splits.length - 1 ? split + separator : split;

        // If adding this split would exceed chunk size
        if (currentChunk.length + splitWithSep.length > chunkSize && currentChunk.length > 0) {
          // Save current chunk
          const metadata: ChunkMetadata = {
            chunkType: 'paragraph',
            hasContext: separatorIndex < 2 // Has context if split on paragraph/line breaks
          };

          chunks.push({
            content: currentChunk,
            index: chunkIndex++,
            tokenCount: this.estimateTokenCount(currentChunk),
            metadata
          });

          // Start new chunk with overlap
          const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
          currentChunk = overlapText + splitWithSep;
        } else {
          currentChunk += splitWithSep;
        }
      }

      // Add remaining chunk
      if (currentChunk.trim().length > 0) {
        const metadata: ChunkMetadata = {
          chunkType: 'paragraph',
          hasContext: separatorIndex < 2
        };

        chunks.push({
          content: currentChunk,
          index: chunkIndex++,
          tokenCount: this.estimateTokenCount(currentChunk),
          metadata
        });
      }

      // If any chunk is still too large, recursively split with next separator
      const finalChunks: DocumentChunk[] = [];
      let finalIndex = 0;

      for (const chunk of chunks) {
        if (chunk.content.length > chunkSize * 1.5) {
          // Chunk too large, split with next separator
          const subChunks = this.recursiveSplit(
            chunk.content,
            chunkSize,
            chunkOverlap,
            separators,
            separatorIndex + 1
          );
          for (const subChunk of subChunks) {
            finalChunks.push({
              ...subChunk,
              index: finalIndex++
            });
          }
        } else {
          finalChunks.push({
            ...chunk,
            index: finalIndex++
          });
        }
      }

      return finalChunks;
    }

    /**
     * Get overlap text from end of chunk
     */
    private getOverlapText(text: string, overlapSize: number): string {
      if (text.length <= overlapSize) {
        return text;
      }
      return text.slice(-overlapSize);
    }

    /**
     * Character-level splitting (last resort)
     */
    private characterSplit(
      content: string,
      chunkSize: number,
      chunkOverlap: number
    ): DocumentChunk[] {
      const chunks: DocumentChunk[] = [];
      let startIndex = 0;
      let chunkIndex = 0;

      while (startIndex < content.length) {
        const endIndex = Math.min(startIndex + chunkSize, content.length);
        const chunkContent = content.slice(startIndex, endIndex);

        const metadata: ChunkMetadata = {
          chunkType: 'paragraph',
          hasContext: false
        };

        chunks.push({
          content: chunkContent,
          index: chunkIndex++,
          tokenCount: this.estimateTokenCount(chunkContent),
          metadata
        });

        const nextStart = endIndex - chunkOverlap;
        if (nextStart <= startIndex) {
          startIndex = endIndex;
        } else {
          startIndex = nextStart;
        }

        if (startIndex >= content.length) {
          break;
        }
      }

      return chunks;
    }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
