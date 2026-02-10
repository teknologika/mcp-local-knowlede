#!/usr/bin/env node
/**
 * Test ChromaDB with the syntax the user provided
 */

import { ChromaClient } from 'chromadb';

async function test() {
  console.log('Testing ChromaDB with user-provided syntax...');
  console.log('');
  
  // Exactly as user showed
  const client = new ChromaClient({
    path: "./my-local-vector-store"
  });
  
  console.log('Client created');
  console.log('');
  
  try {
    const collection = await client.getOrCreateCollection({
      name: "my_collection",
    });
    
    console.log('✓ Collection created!');
    console.log('');
    
    await collection.add({
      ids: ["id1"],
      documents: ["This is a persistent document"],
      metadatas: [{ source: "local-file" }]
    });
    
    console.log('✓ Document added!');
    console.log('');
    
    const results = await collection.query({
      queryTexts: ["What is this document?"],
      nResults: 1
    });
    
    console.log('✓ Query successful!');
    console.log('Results:', results);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
  }
}

test();
