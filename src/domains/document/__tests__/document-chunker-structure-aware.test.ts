import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentChunkerService } from '../document-chunker.service.js';
import { Docling } from 'docling-sdk';

// Mock logging module
vi.mock('../../../shared/logging/index.js', () => ({
  createLogger: vi.fn(() => {
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(),
    };
    mockLogger.child.mockReturnValue(mockLogger);
    return mockLogger;
  }),
}));

// Mock docling-sdk
vi.mock('docling-sdk', () => ({
  Docling: vi.fn().mockImplementation(() => ({
    chunk: vi.fn(),
  })),
}));

describe('DocumentChunkerService - Structure-Aware Chunking', () => {
  let service: DocumentChunkerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentChunkerService({ outputDir: './temp' });
  });

  describe('Markdown Heading Detection', () => {
    it('should detect H1 markdown headers (#)', async () => {
      const content = `# Introduction

This is the introduction section with some content.

# Conclusion

This is the conclusion.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('Introduction'))).toBe(true);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('Conclusion'))).toBe(true);
    });

    it('should detect H2 markdown headers (##)', async () => {
      const content = `## Section One

Content for section one.

## Section Two

Content for section two.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('Section One'))).toBe(true);
    });

    it('should detect H3-H6 markdown headers', async () => {
      const content = `### Subsection
#### Sub-subsection
##### Level 5
###### Level 6

Content here.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metadata.chunkType).toBe('section');
    });

    it('should handle markdown headers with special characters', async () => {
      const content = `# Introduction: Getting Started

Content here.

## Section 1.1 - Overview

More content.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => 
        chunk.metadata.headingPath?.some(h => h.includes('Introduction'))
      )).toBe(true);
    });
  });

  describe('Plain Text Heading Detection', () => {
    it('should detect ALL CAPS headings', async () => {
      const content = `INTRODUCTION
This is the introduction section with regular text.

METHODOLOGY
This describes the methodology used.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('INTRODUCTION'))).toBe(true);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('METHODOLOGY'))).toBe(true);
    });

    it('should detect underlined headings with ===', async () => {
      const content = `Introduction
===========

This is the introduction content.

Conclusion
==========

This is the conclusion.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('Introduction'))).toBe(true);
    });

    it('should detect underlined headings with ---', async () => {
      const content = `Section One
-----------

Content for section one.

Section Two
-----------

Content for section two.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('Section One'))).toBe(true);
    });

    it('should detect numbered sections (1. 2. 3.)', async () => {
      const content = `1. Introduction

This is the first section.

2. Background

This is the second section.

3. Methodology

This is the third section.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('Introduction'))).toBe(true);
    });

    it('should detect nested numbered sections (1.1, 1.2)', async () => {
      const content = `1.1 Overview

Content for overview.

1.2 Details

Content for details.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      // Should detect headings and create sections
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('Overview'))).toBe(true);
    });

    it('should detect Chapter/Section/Part markers', async () => {
      const content = `Chapter 1: Introduction

This is chapter one content.

Section 2: Methodology

This is section two content.

Part 3: Results

This is part three content.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => 
        chunk.metadata.headingPath?.some(h => h.includes('Introduction'))
      )).toBe(true);
    });

    it('should detect Chapter with Roman numerals', async () => {
      const content = `Chapter I: The Beginning

Content here.

Chapter II: The Middle

More content.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metadata.chunkType).toBe('section');
    });

    it('should not detect false positives for ALL CAPS', async () => {
      const content = `This is a sentence with SOME CAPS WORDS in it.

This is normal text.`;

      const result = await service.chunkDocument(content);

      // Should not treat "SOME CAPS WORDS" as a heading
      expect(result.length).toBeGreaterThan(0);
    });

    it('should not detect numbers-only as headings', async () => {
      const content = `
123456

This is content after numbers.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      // Should not have heading path for numbers
    });
  });

  describe('Heading-Based Chunking', () => {
    it('should create separate chunks for each heading section', async () => {
      const content = `# Section 1

Content for section 1.

# Section 2

Content for section 2.

# Section 3

Content for section 3.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBe(3);
      expect(result[0].metadata.headingPath).toEqual(['Section 1']);
      expect(result[1].metadata.headingPath).toEqual(['Section 2']);
      expect(result[2].metadata.headingPath).toEqual(['Section 3']);
    });

    it('should keep small sections as single chunks', async () => {
      const content = `# Small Section

Just a little bit of content here.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBe(1);
      expect(result[0].content).toContain('Small Section');
      expect(result[0].metadata.chunkType).toBe('section');
    });

    it('should split large sections into multiple chunks', async () => {
      const largeContent = 'A'.repeat(3000);
      const content = `# Large Section

${largeContent}`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(1);
      expect(result.every(chunk => chunk.metadata.headingPath?.includes('Large Section'))).toBe(true);
    });

    it('should preserve heading context in all sub-chunks', async () => {
      const largeContent = 'B'.repeat(5000);
      const content = `# Important Section

${largeContent}`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(1);
      result.forEach(chunk => {
        expect(chunk.metadata.headingPath).toEqual(['Important Section']);
      });
    });

    it('should set chunkType to section for heading-based chunks', async () => {
      const content = `# Section One

Content here.

# Section Two

More content.`;

      const result = await service.chunkDocument(content);

      result.forEach(chunk => {
        expect(chunk.metadata.chunkType).toBe('section');
      });
    });

    it('should set hasContext to true for heading-based chunks', async () => {
      const content = `# Section

Content with context.`;

      const result = await service.chunkDocument(content);

      result.forEach(chunk => {
        expect(chunk.metadata.hasContext).toBe(true);
      });
    });
  });

  describe('Recursive Chunking Fallback', () => {
    it('should use recursive chunking when no headings detected', async () => {
      const content = `This is a plain text document without any headings.

It has multiple paragraphs.

Each paragraph is separated by blank lines.

This should be chunked intelligently.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metadata.chunkType).toBe('paragraph');
    });

    it('should prefer splitting on paragraph breaks (\\n\\n)', async () => {
      const para1 = 'A'.repeat(500);
      const para2 = 'B'.repeat(500);
      const para3 = 'C'.repeat(500);
      const content = `${para1}\n\n${para2}\n\n${para3}`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      // Should split on paragraph breaks
    });

    it('should split on line breaks (\\n) if paragraphs too large', async () => {
      const line1 = 'A'.repeat(1500);
      const line2 = 'B'.repeat(1500);
      const content = `${line1}\n${line2}`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(1);
    });

    it('should split on sentence breaks (. ) if needed', async () => {
      const sentences = Array(50).fill('This is a sentence').join('. ');
      const content = sentences + '.';

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should split on word breaks ( ) as last resort before characters', async () => {
      const longWord = 'A'.repeat(3000);
      const content = `word1 word2 ${longWord} word3`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should split on characters only as absolute last resort', async () => {
      const content = 'A'.repeat(5000); // No natural breaks

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].content.length).toBeLessThanOrEqual(2000);
    });

    it('should include overlap between chunks', async () => {
      const content = 'A'.repeat(5000);

      const result = await service.chunkDocument(content, {
        chunkSize: 2000,
        chunkOverlap: 400
      });

      expect(result.length).toBeGreaterThan(1);
      // Chunks should have overlapping content
    });

    it('should set hasContext based on split type', async () => {
      const content = `Paragraph one.\n\nParagraph two.\n\nParagraph three.`;

      const result = await service.chunkDocument(content);

      // Chunks split on paragraph breaks should have context
      expect(result.some(chunk => chunk.metadata.hasContext === true)).toBe(true);
    });
  });

  describe('Chunk Size Configuration', () => {
    it('should use default chunk size of 2000 characters', async () => {
      const content = 'A'.repeat(5000);

      const result = await service.chunkDocument(content);

      expect(result[0].content.length).toBeLessThanOrEqual(2000);
    });

    it('should use default overlap of 400 characters', async () => {
      const content = 'A'.repeat(5000);

      const result = await service.chunkDocument(content, {
        chunkSize: 2000,
        chunkOverlap: 400
      });

      expect(result.length).toBeGreaterThan(1);
    });

    it('should respect custom chunk size', async () => {
      const content = 'A'.repeat(5000);

      const result = await service.chunkDocument(content, {
        chunkSize: 1000
      });

      expect(result[0].content.length).toBeLessThanOrEqual(1000);
    });

    it('should respect custom overlap', async () => {
      const content = 'A'.repeat(5000);

      const result = await service.chunkDocument(content, {
        chunkSize: 2000,
        chunkOverlap: 200
      });

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Token Count Estimation', () => {
    it('should estimate token count for chunks', async () => {
      const content = 'A'.repeat(400); // ~100 tokens

      const result = await service.chunkDocument(content);

      expect(result[0].tokenCount).toBeGreaterThan(0);
      expect(result[0].tokenCount).toBeCloseTo(100, -1);
    });

    it('should estimate tokens for all chunks', async () => {
      const content = 'A'.repeat(5000);

      const result = await service.chunkDocument(content);

      result.forEach(chunk => {
        expect(chunk.tokenCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const content = '';

      const result = await service.chunkDocument(content);

      expect(result).toHaveLength(0);
    });

    it('should handle whitespace-only content', async () => {
      const content = '   \n\t\n   ';

      const result = await service.chunkDocument(content);

      expect(result).toHaveLength(0);
    });

    it('should handle content with only headings', async () => {
      const content = `# Heading 1
## Heading 2
### Heading 3`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle mixed markdown and plain text headings', async () => {
      const content = `# Markdown Heading

Content here.

PLAIN TEXT HEADING

More content.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters in headings', async () => {
      const content = `# Heading with émojis 🎉 and symbols ©®™

Content here.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metadata.headingPath?.[0]).toContain('🎉');
    });

    it('should handle very long headings', async () => {
      const longHeading = 'A'.repeat(200);
      const content = `# ${longHeading}

Content here.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should assign sequential indices to all chunks', async () => {
      const content = `# Section 1

Content 1.

# Section 2

Content 2.

# Section 3

Content 3.`;

      const result = await service.chunkDocument(content);

      result.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
      });
    });
  });

  describe('Real-World Document Examples', () => {
    it('should handle README-style markdown', async () => {
      const content = `# Project Name

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Here's how to use it.

## API Reference

### Method 1

Description of method 1.

### Method 2

Description of method 2.`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('Installation'))).toBe(true);
    });

    it('should handle academic paper structure', async () => {
      const content = `ABSTRACT
This paper presents...

INTRODUCTION
The field of...

METHODOLOGY
We employed...

RESULTS
Our findings show...

CONCLUSION
In conclusion...`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(chunk => chunk.metadata.headingPath?.includes('ABSTRACT'))).toBe(true);
    });

    it('should handle technical documentation', async () => {
      const content = `1. Getting Started

1.1 Prerequisites

You will need...

1.2 Installation

Follow these steps...

2. Configuration

2.1 Basic Setup

Configure the basics...`;

      const result = await service.chunkDocument(content);

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
