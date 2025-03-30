import { DatabaseService } from '@core/database-service';
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

async function extractContent(filePath: string, fileExtension: string): Promise<string> {
  switch (fileExtension.toLowerCase()) {
    case '.pdf':
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text;
    case '.txt':
      return await fs.readFile(filePath, 'utf-8');
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

async function storeDocumentation(filePath: string) {
  try {
    const dbService = new DatabaseService();
    await dbService.initialize();

    // Get file metadata
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath);

    // Extract content based on file type
    const content = await extractContent(filePath, fileExtension);
    
    // Prepare metadata
    const metadata = {
      source: 'documentation',
      file_name: fileName,
      file_extension: fileExtension,
      file_size: stats.size,
      last_modified: stats.mtime.toISOString(),
      created_at: stats.birthtime.toISOString(),
      content_type: fileExtension.toLowerCase() === '.pdf' ? 'application/pdf' : 'text/plain',
    };

    // Store in database
    const pointId = await dbService.storeDomainKnowledge(
      content,
      'documentation',
      metadata
    );

    console.log(`Successfully stored documentation from ${fileName} with ID: ${pointId}`);
    console.log(`Content length: ${content.length} characters`);
  } catch (error) {
    console.error('Error storing documentation:', error);
    process.exit(1);
  }
}

// Get file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a file path as an argument');
  process.exit(1);
}

storeDocumentation(filePath); 