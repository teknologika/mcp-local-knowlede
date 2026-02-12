/**
 * File classification utilities
 * Detects test files based on path patterns
 */

/**
 * Test directory patterns
 * Matches common test directory names in file paths
 */
const TEST_DIR_PATTERNS = [
  /__tests__\//,
  /\/tests?\//,
  /\/spec\//,
  /\/test\//,
];

/**
 * Check if a file path represents a test file
 * Checks if the path contains "test" or "spec" in any component
 */
export function isTestFile(filePath: string): boolean {
  // Check directory patterns
  for (const pattern of TEST_DIR_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }

  // Check if filename contains "test" or "spec"
  const fileName = filePath.split('/').pop() || '';
  const lowerFileName = fileName.toLowerCase();
  
  return lowerFileName.includes('test') || lowerFileName.includes('spec');
}

/**
 * Classify a file path
 */
export interface FileClassification {
  isTest: boolean;
}

export function classifyFile(filePath: string): FileClassification {
  return {
    isTest: isTestFile(filePath),
  };
}
