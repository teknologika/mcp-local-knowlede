import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DocumentConverterService } from '../document-converter.service.js';
import { DocumentChunkerService } from '../document-chunker.service.js';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Integration tests for document conversion and chunking pipeline
 * Tests the full flow: PDF → Conversion → Chunking
 */
describe('Document Integration Tests', () => {
  const testDir = './temp/integration-test';
  let converter: DocumentConverterService;
  let chunker: DocumentChunkerService;

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    converter = new DocumentConverterService({ 
      outputDir: testDir,
      conversionTimeout: 60000 
    });
    chunker = new DocumentChunkerService({ outputDir: testDir });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Markdown file processing', () => {
    it('should convert and chunk markdown file with structure', async () => {
      // Arrange
      const mdContent = `# Main Title

## Section 1

This is the first section with some content.
It has multiple paragraphs.

## Section 2

This is the second section.

### Subsection 2.1

More detailed content here.

## Section 3

Final section with a table:

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
`;
      const mdPath = join(testDir, 'test-doc.md');
      await writeFile(mdPath, mdContent);

      // Act
      const conversionResult = await converter.convertDocument(mdPath);
      const chunks = await chunker.chunkDocument(conversionResult.markdown);

      // Assert
      expect(conversionResult.markdown).toBe(mdContent);
      expect(conversionResult.metadata.format).toBe('markdown');
      expect(conversionResult.metadata.wordCount).toBeGreaterThan(0);
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].metadata.chunkType).toBeDefined();
      expect(chunks[0].tokenCount).toBeGreaterThan(0);
      
      // Should detect headings
      const hasHeadingContext = chunks.some(c => c.metadata.headingPath && c.metadata.headingPath.length > 0);
      expect(hasHeadingContext).toBe(true);
    });

    it('should handle plain text without structure', async () => {
      // Arrange
      const textContent = 'This is plain text without any structure. '.repeat(50);
      const txtPath = join(testDir, 'plain.txt');
      await writeFile(txtPath, textContent);

      // Act
      const conversionResult = await converter.convertDocument(txtPath);
      const chunks = await chunker.chunkDocument(conversionResult.markdown);

      // Assert
      expect(conversionResult.markdown).toBe(textContent);
      expect(conversionResult.metadata.format).toBe('text');
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content.length).toBeLessThanOrEqual(2500); // Should respect chunk size
    });
  });

  describe('Document metadata extraction', () => {
    it('should extract word count correctly', async () => {
      // Arrange
      const content = 'One two three four five six seven eight nine ten';
      const path = join(testDir, 'wordcount.txt');
      await writeFile(path, content);

      // Act
      const result = await converter.convertDocument(path);

      // Assert
      expect(result.metadata.wordCount).toBe(10);
    });

    it('should record conversion duration', async () => {
      // Arrange
      const content = '# Test\n\nContent';
      const path = join(testDir, 'timing.md');
      await writeFile(path, content);

      // Act
      const result = await converter.convertDocument(path);

      // Assert
      expect(result.metadata.conversionDuration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.conversionDuration).toBeLessThan(5000); // Should be fast for text
    });
  });

  describe('Chunking strategies', () => {
    it('should create overlapping chunks for continuity', async () => {
      // Arrange
      const longText = 'Word '.repeat(1000); // 1000 words
      const path = join(testDir, 'long.txt');
      await writeFile(path, longText);

      // Act
      const conversionResult = await converter.convertDocument(path);
      const chunks = await chunker.chunkDocument(conversionResult.markdown, {
        chunkSize: 500,
        chunkOverlap: 100,
      });

      // Assert
      expect(chunks.length).toBeGreaterThan(1);
      
      // Check for overlap between consecutive chunks
      if (chunks.length > 1) {
        const firstChunkEnd = chunks[0].content.slice(-50);
        const secondChunkStart = chunks[1].content.slice(0, 50);
        
        // Should have some overlap
        expect(secondChunkStart).toContain(firstChunkEnd.split(' ').slice(-2).join(' '));
      }
    });

    it('should respect maximum chunk size', async () => {
      // Arrange
      const veryLongText = 'Word '.repeat(2000);
      const path = join(testDir, 'very-long.txt');
      await writeFile(path, veryLongText);

      // Act
      const conversionResult = await converter.convertDocument(path);
      const chunks = await chunker.chunkDocument(conversionResult.markdown, {
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      // Assert
      for (const chunk of chunks) {
        // Allow some tolerance for overlap
        expect(chunk.content.length).toBeLessThanOrEqual(1200);
      }
    });

    it('should preserve heading context in chunks', async () => {
      // Arrange
      const structuredDoc = `# Chapter 1

Content for chapter 1.

## Section 1.1

More content here.

# Chapter 2

Content for chapter 2.`;
      const path = join(testDir, 'structured.md');
      await writeFile(path, structuredDoc);

      // Act
      const conversionResult = await converter.convertDocument(path);
      const chunks = await chunker.chunkDocument(conversionResult.markdown);

      // Assert
      const chunksWithHeadings = chunks.filter(c => 
        c.metadata.headingPath && c.metadata.headingPath.length > 0
      );
      expect(chunksWithHeadings.length).toBeGreaterThan(0);
      
      // Should have chapter headings
      const hasChapter1 = chunks.some(c => 
        c.metadata.headingPath?.includes('Chapter 1')
      );
      const hasChapter2 = chunks.some(c => 
        c.metadata.headingPath?.includes('Chapter 2')
      );
      expect(hasChapter1 || hasChapter2).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle empty files gracefully', async () => {
      // Arrange
      const path = join(testDir, 'empty.txt');
      await writeFile(path, '');

      // Act
      const conversionResult = await converter.convertDocument(path);
      const chunks = await chunker.chunkDocument(conversionResult.markdown);

      // Assert
      expect(conversionResult.markdown).toBe('');
      expect(conversionResult.metadata.wordCount).toBe(0);
      expect(chunks.length).toBe(0);
    });

    it('should handle files with only whitespace', async () => {
      // Arrange
      const path = join(testDir, 'whitespace.txt');
      await writeFile(path, '   \n\n\t\n   ');

      // Act
      const conversionResult = await converter.convertDocument(path);
      const chunks = await chunker.chunkDocument(conversionResult.markdown);

      // Assert
      expect(conversionResult.metadata.wordCount).toBe(0);
      expect(chunks.length).toBe(0);
    });
  });

  describe('Format detection', () => {
    it('should detect all supported text formats', async () => {
      const formats = [
        { ext: '.md', type: 'markdown' },
        { ext: '.txt', type: 'text' },
        { ext: '.html', type: 'html' },
      ];

      for (const format of formats) {
        const path = join(testDir, `test${format.ext}`);
        await writeFile(path, '# Test content');
        
        const result = await converter.convertDocument(path);
        expect(result.metadata.format).toBe(format.type);
      }
    });
  });
});
