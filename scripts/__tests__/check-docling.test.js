import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'child_process';

// Mock child_process
vi.mock('child_process');

// Import after mocking
const { checkDocling } = await import('../check-docling.js');

describe('checkDocling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success when Python 3.10+ and Docling are installed', async () => {
    execSync
      .mockReturnValueOnce('Python 3.11.5\n')  // python3 --version
      .mockReturnValueOnce('docling 1.0.0\n'); // python3 -m docling --version

    const result = await checkDocling();

    expect(result.success).toBe(true);
    expect(result.pythonVersion).toBe('Python 3.11.5');
    expect(result.error).toBeUndefined();
  });

  it('should return error when Python is not installed', async () => {
    execSync.mockImplementation(() => {
      throw new Error('Command not found');
    });

    const result = await checkDocling();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Python is not installed or not in PATH');
    expect(result.pythonVersion).toBeUndefined();
  });

  it('should return error when Python version is too old', async () => {
    execSync.mockReturnValueOnce('Python 3.9.5\n'); // python3 --version

    const result = await checkDocling();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Python version must be 3.10 or higher');
    expect(result.pythonVersion).toBe('Python 3.9.5');
  });

  it('should return error when Docling is not installed', async () => {
    execSync
      .mockReturnValueOnce('Python 3.11.5\n')  // python3 --version
      .mockImplementationOnce(() => {           // python3 -m docling --version
        throw new Error('No module named docling');
      })
      .mockImplementationOnce(() => {           // python -m docling --version
        throw new Error('No module named docling');
      });

    const result = await checkDocling();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Docling package is not installed');
    expect(result.pythonVersion).toBe('Python 3.11.5');
  });

  it('should fallback to python command when python3 is not available', async () => {
    execSync
      .mockImplementationOnce(() => {           // python3 --version fails
        throw new Error('Command not found');
      })
      .mockReturnValueOnce('Python 3.11.5\n')  // python --version
      .mockImplementationOnce(() => {           // python3 -m docling --version fails
        throw new Error('Command not found');
      })
      .mockReturnValueOnce('docling 1.0.0\n'); // python -m docling --version

    const result = await checkDocling();

    expect(result.success).toBe(true);
    expect(result.pythonVersion).toBe('Python 3.11.5');
  });

  it('should accept Python 3.10 as minimum version', async () => {
    execSync
      .mockReturnValueOnce('Python 3.10.0\n')  // python3 --version
      .mockReturnValueOnce('docling 1.0.0\n'); // python3 -m docling --version

    const result = await checkDocling();

    expect(result.success).toBe(true);
    expect(result.pythonVersion).toBe('Python 3.10.0');
  });

  it('should accept Python 4.x as valid version', async () => {
    execSync
      .mockReturnValueOnce('Python 4.0.0\n')   // python3 --version
      .mockReturnValueOnce('docling 1.0.0\n'); // python3 -m docling --version

    const result = await checkDocling();

    expect(result.success).toBe(true);
    expect(result.pythonVersion).toBe('Python 4.0.0');
  });
});
