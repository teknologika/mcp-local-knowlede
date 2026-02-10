#!/usr/bin/env node
/**
 * Test ChromaDB connection to running server
 */

import { ChromaClient } from 'chromadb';

async function test() {
  console.log('Testing ChromaDB connection to http://localhost:8000...');
  console.log('');
  console.log('Make sure ChromaDB server is running:');
  console.log('  npx chroma run --path ./.codebase-memory/chromadb');
  console.log('');
  
  try {
    // Connect to running server
    const client = new ChromaClient({
      path: 'http://localhost:8000'
    });
    
    console.log('✓ Client created');
    
    // Test heartbeat
    await client.heartbeat();
    console.log('✓ Heartbeat successful');
    
    // List collections
    const collections = await client.listCollections();
    console.log(`✓ Found ${collections.length} collection(s)`);
    
    // Create test collection
    const collection = await client.getOrCreateCollection({
      name: 'test_collection',
      metadata: { test: 'true' }
    });
    console.log('✓ Collection created:', collection.name);
    
    // Add a document
    await collection.add({
      ids: ['test1'],
      documents: ['This is a test document'],
      metadatas: [{ source: 'test' }]
    });
    console.log('✓ Document added');
    
    // Query
    const results = await collection.query({
      queryTexts: ['test document'],
      nResults: 1
    });
    console.log('✓ Query successful');
    console.log('  Results:', results.documents[0]);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS! ChromaDB is working correctly');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('');
    console.error('✗ ERROR:', error.message);
    console.error('');
    console.error('Make sure ChromaDB server is running:');
    console.error('  npx chroma run --path ./.codebase-memory/chromadb');
    console.error('');
    process.exit(1);
  }
}

test();
