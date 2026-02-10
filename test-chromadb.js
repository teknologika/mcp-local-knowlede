#!/usr/bin/env node
/**
 * Test script to verify ChromaDB client works with local persistence
 */

import { ChromaClient } from 'chromadb';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testChromaDB() {
  console.log('='.repeat(60));
  console.log('ChromaDB Local Persistence Test');
  console.log('='.repeat(60));
  console.log('');

  // Test directory
  const testPath = join(__dirname, '.test-chromadb');
  console.log(`Test directory: ${testPath}`);
  
  // Create directory if it doesn't exist
  if (!existsSync(testPath)) {
    console.log('Creating test directory...');
    mkdirSync(testPath, { recursive: true });
  }
  
  console.log('');
  console.log('Step 1: Creating ChromaClient with local path...');
  
  try {
    const client = new ChromaClient({
      path: testPath
    });
    console.log('✓ ChromaClient created successfully');
    console.log('');
    
    console.log('Step 2: Testing heartbeat...');
    try {
      await client.heartbeat();
      console.log('✓ Heartbeat successful');
    } catch (error) {
      console.log('✗ Heartbeat failed:', error.message);
      console.log('  This might be expected for file-based storage');
    }
    console.log('');
    
    console.log('Step 3: Listing collections...');
    try {
      const collections = await client.listCollections();
      console.log(`✓ Found ${collections.length} collection(s)`);
      if (collections.length > 0) {
        collections.forEach(col => {
          console.log(`  - ${col.name}`);
        });
      }
    } catch (error) {
      console.log('✗ List collections failed:', error.message);
      console.log('  Error details:', error);
    }
    console.log('');
    
    console.log('Step 4: Creating a test collection...');
    try {
      const collection = await client.getOrCreateCollection({
        name: 'test_collection',
        metadata: { test: 'true' }
      });
      console.log('✓ Collection created/retrieved:', collection.name);
    } catch (error) {
      console.log('✗ Create collection failed:', error.message);
      console.log('  Error details:', error);
    }
    console.log('');
    
    console.log('Step 5: Listing collections again...');
    try {
      const collections = await client.listCollections();
      console.log(`✓ Found ${collections.length} collection(s)`);
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    } catch (error) {
      console.log('✗ List collections failed:', error.message);
    }
    console.log('');
    
    console.log('='.repeat(60));
    console.log('Test completed!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('');
    console.error('✗ FATAL ERROR:', error.message);
    console.error('');
    console.error('Full error:', error);
    console.error('');
    console.error('This suggests ChromaDB client cannot be initialized.');
    console.error('The JavaScript client may require a running ChromaDB server.');
    console.error('');
    process.exit(1);
  }
}

// Run the test
testChromaDB().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
