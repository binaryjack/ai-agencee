/**
 * Template Management Commands — Phase 2.1
 * 
 * Provides DAG template library with install, list, and info commands.
 * 
 * Philosophy: "Start with proven patterns, customize as needed"
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import prompts from 'prompts';
import { enrichError, exitWithError, ErrorCategory } from '../../utils/error-formatter.js';

/**
 * Template metadata structure
 */
interface TemplateMetadata {
  name: string;
  id: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  recommendedModel: string;
  files: string[];
  tags: string[];
  requirements: {
    minVersion: string;
    dependencies: string[];


  };
}

/**
 * Get templates directory path
 */
function getTemplatesDir(): string {
  // Templates are in packages/cli/templates/
  // This file is in packages/cli/src/commands/template/index.ts
  // At runtime (compiled): packages/cli/dist/src/commands/template/index.js
  // Need to go up to packages/cli/ and then into templates/
  
  // __dirname at runtime:
  // - Development: packages/cli/src/commands/template/
  // - Production: packages/cli/dist/src/commands/template/
  
  // Go up from dist/src/commands/template/ to cli/, then into templates/
  // Or from src/commands/template/ to cli/, then into templates/
  
  const templatesDirFromDist = path.resolve(__dirname, '../../../../templates');
  const templatesDirFromSrc = path.resolve(__dirname, '../../../templates');
  
  // Check which one exists
  try {
    const fs = require('fs');
    if (fs.existsSync(templatesDirFromDist)) {
      return templatesDirFromDist;
    }
  } catch {
    // Ignore
  }
  
  return templatesDirFromSrc;
}

/**
 * List all available templates
 */
export async function listTemplates(): Promise<void> {
  try {
    const templatesDir = getTemplatesDir();
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });
    
    // Filter out non-template directories (demos, README.md, etc.)
    const templateDirs = entries.filter(e => 
      e.isDirectory() && 
      e.name !== 'demos' && 
      !e.name.startsWith('.')
    );

    if (templateDirs.length === 0) {
      console.log('\n📦 No templates available yet.\n');
      return;
    }

    console.log('\n📦 Available DAG Templates\n');
    console.log('═'.repeat(70));

    // Load and display each template
    for (const dir of templateDirs) {
      const templatePath = path.join(templatesDir, dir.name);
      const metadataPath = path.join(templatePath, 'template.json');

      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata: TemplateMetadata = JSON.parse(metadataContent);

        // Format difficulty
        const difficultyBadge = {
          beginner: '🟢',
          intermediate: '🟡',
          advanced: '🔴',
        }[metadata.difficulty];

        // Format cost range
        const costRange = `$${metadata.estimatedCost.min.toFixed(2)}-${metadata.estimatedCost.max.toFixed(2)}`;

        console.log(`\n${difficultyBadge} ${metadata.name} (${metadata.id})`);
        console.log(`   ${metadata.description}`);
        console.log(`   Cost: ${costRange} | Model: ${metadata.recommendedModel} | Category: ${metadata.category}`);
        console.log(`   Tags: ${metadata.tags.join(', ')}`);
      } catch (err) {
        // Template directory exists but no template.json (skip it)
        console.warn(`⚠️  Skipping ${dir.name} (no template.json)`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n💡 Install a template:');
    console.log('   ai-kit template:install <template-id>\n');
    console.log('📖 View template details:');
    console.log('   ai-kit template:info <template-id>\n');
  } catch (err) {
    const richError = enrichError(err, ErrorCategory.FILE_SYSTEM, [
      'Ensure CLI package is installed correctly',
      'Check templates directory exists',
    ]);
    exitWithError(richError);
  }
}

/**
 * Show detailed information about a template
 */
export async function showTemplateInfo(templateId: string): Promise<void> {
  try {
    const templatesDir = getTemplatesDir();
    const templatePath = path.join(templatesDir, templateId);
    const metadataPath = path.join(templatePath, 'template.json');
    const readmePath = path.join(templatePath, 'README.md');

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch {
      console.error(`\n❌ Template not found: ${templateId}\n`);
      console.log('Run "ai-kit template:list" to see available templates.\n');
      process.exit(1);
    }

    // Load metadata
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata: TemplateMetadata = JSON.parse(metadataContent);

    // Display info
    console.log('\n📦 Template Information\n');
    console.log('═'.repeat(70));
    console.log(`\nName: ${metadata.name}`);
    console.log(`ID: ${metadata.id}`);
    console.log(`Description: ${metadata.description}`);
    console.log(`Category: ${metadata.category}`);
    console.log(`Difficulty: ${metadata.difficulty}`);
    console.log(`\nEstimated Cost: $${metadata.estimatedCost.min.toFixed(2)}-${metadata.estimatedCost.max.toFixed(2)} ${metadata.estimatedCost.currency}`);
    console.log(`Recommended Model: ${metadata.recommendedModel}`);
    console.log(`\nFiles included:`);
    metadata.files.forEach(file => console.log(`  - ${file}`));
    console.log(`\nTags: ${metadata.tags.join(', ')}`);
    console.log(`\nRequirements:`);
    console.log(`  Min Version: ${metadata.requirements.minVersion}`);
    if (metadata.requirements.dependencies.length > 0) {
      console.log(`  Dependencies: ${metadata.requirements.dependencies.join(', ')}`);
    }

    // Show README if exists
    try {
      const readme = await fs.readFile(readmePath, 'utf-8');
      console.log('\n' + '═'.repeat(70));
      console.log('\n📖 README\n');
      console.log(readme);
    } catch {
      // No README, skip it
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`\n💡 Install this template:`);
    console.log(`   ai-kit template:install ${templateId}\n`);
  } catch (err) {
    const richError = enrichError(err, ErrorCategory.FILE_SYSTEM);
    exitWithError(richError);
  }
}

/**
 * Install a template to the current project
 */
export async function installTemplate(
  templateId: string,
  options: {
    dir?: string;
    name?: string;
    force?: boolean;
  } = {}
): Promise<void> {
  try {
    const templatesDir = getTemplatesDir();
    const templatePath = path.join(templatesDir, templateId);
    const metadataPath = path.join(templatePath, 'template.json');

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch {
      console.error(`\n❌ Template not found: ${templateId}\n`);
      console.log('Run "ai-kit template:list" to see available templates.\n');
      process.exit(1);
    }

    // Load metadata
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata: TemplateMetadata = JSON.parse(metadataContent);

    // Determine target directory
    const targetDir = options.dir 
      ? path.resolve(process.cwd(), options.dir)
      : path.join(process.cwd(), 'agents');

    // Check if target directory exists
    try {
      await fs.access(targetDir);
    } catch {
      // Create target directory if it doesn't exist
      await fs.mkdir(targetDir, { recursive: true });
    }

    // Check for existing files (unless --force)
    const existingFiles: string[] = [];
    for (const file of metadata.files) {
      if (file === 'template.json') continue; // Skip template.json (not needed in project)
      
      const targetFile = path.join(targetDir, file);
      try {
        await fs.access(targetFile);
        existingFiles.push(file);
      } catch {
        // File doesn't exist, ok to install
      }
    }

    if (existingFiles.length > 0 && !options.force) {
      console.log(`\n⚠️  The following files already exist in ${targetDir}:\n`);
      existingFiles.forEach(file => console.log(`  - ${file}`));
      console.log('');

      const { overwrite } = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: 'Overwrite existing files?',
        initial: false,
      });

      if (!overwrite) {
        console.log('\n❌ Installation cancelled.\n');
        process.exit(0);
      }
    }

    // Copy template files
    console.log(`\n📦 Installing template: ${metadata.name}\n`);
    
    let copiedCount = 0;
    for (const file of metadata.files) {
      if (file === 'template.json') continue; // Skip template.json

      const sourceFile = path.join(templatePath, file);
      const targetFile = path.join(targetDir, file);

      await fs.copyFile(sourceFile, targetFile);
      console.log(`  ✓ ${file}`);
      copiedCount++;
    }

    console.log(`\n✅ Installed ${copiedCount} files to ${targetDir}\n`);
    console.log('Next steps:\n');
    console.log(`  1. Review configuration files in ${targetDir}/`);
    console.log(`  2. Customize agent prompts and checks`);
    console.log(`  3. Run the workflow:`);
    console.log(`     ai-kit agent:dag ${targetDir}/dag.json\n`);
    console.log(`💡 Cost estimate: $${metadata.estimatedCost.min.toFixed(2)}-${metadata.estimatedCost.max.toFixed(2)}\n`);
  } catch (err) {
    const richError = enrichError(err, ErrorCategory.FILE_SYSTEM, [
      'Ensure you have write permissions',
      'Check target directory exists',
      'Verify template files are valid',
    ]);
    exitWithError(richError);
  }
}

// Exports for CLI registration
export { listTemplates as runTemplateList };
export { showTemplateInfo as runTemplateInfo };
export { installTemplate as runTemplateInstall };
