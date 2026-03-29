/**
 * Template Management Commands — Phase 2.1
 * REFACTORED: Phase 1 - Foundation improvements
 * 
 * Provides DAG template library with install, list, and info commands.
 * 
 * Philosophy: "Start with proven patterns, customize as needed"
 * 
 * Improvements:
 * - Uses @cli/constants for template paths
 * - Uses @cli/services/logger instead of console.log
 * - Uses @cli/types for TemplateOptions
 * - Uses @cli/errors for proper error handling
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import prompts from 'prompts'

// Phase 1: Use centralized constants and types
import { PATHS, getPath } from '../../constants/index.js'
import { FileNotFoundError, UserCancelledError } from '../../errors/index.js'
import { createLogger } from '../../services/logger/index.js'
import type { TemplateOptions } from '../../types/index.js'

// Create namespaced logger
const logger = createLogger('template');

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
 * List all available templates (Phase 1: Use constants for paths)
 */
export async function listTemplates(): Promise<void> {
  logger.debug('Listing templates');
  
  try {
    const templatesDir = PATHS.TEMPLATES_ROOT;
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });
    
    // Filter out non-template directories (demos, README.md, etc.)
    const templateDirs = entries.filter(e => 
      e.isDirectory() && 
      e.name !== 'demos' && 
      !e.name.startsWith('.')
    );

    if (templateDirs.length === 0) {
      logger.info('No templates available yet.');
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
    logger.info('💡 Install a template:');
    logger.info('   ai-kit template:install <template-id>');
    logger.info('📚 View template details:');
    logger.info('   ai-kit template:info <template-id>');
  } catch (error) {
    logger.error('Failed to list templates', { error });
    throw error;
  }
}

/**
 * Show detailed information about a template (Phase 1: Use constants)
 */
export async function showTemplateInfo(templateId: string): Promise<void> {
  logger.debug('Showing template info', { templateId });
  
  try {
    const templatePath = getPath('TEMPLATES_ROOT', templateId);
    const metadataPath = path.join(templatePath, 'template.json');
    const readmePath = path.join(templatePath, 'README.md');

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch {
      logger.error(`Template not found: ${templateId}`);
      logger.info('Run "ai-kit template:list" to see available templates.');
      throw new FileNotFoundError(templatePath);
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
    logger.info(`💡 Install this template:`);
    logger.info(`   ai-kit template:install ${templateId}`);
  } catch (error) {
    logger.error('Failed to show template info', { error });
    throw error;
  }
}

/**
 * Install a template to the current project (Phase 1: Use constants)
 */
export async function installTemplate(
  templateId: string,
  options: TemplateOptions = {}
): Promise<void> {
  logger.info('Installing template', { templateId, options });
  
  try {
    const templatePath = getPath('TEMPLATES_ROOT', templateId);
    const metadataPath = path.join(templatePath, 'template.json');

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch {
      logger.error(`Template not found: ${templateId}`);
      logger.info('Run "ai-kit template:list" to see available templates.');
      throw new FileNotFoundError(templatePath);
    }

    // Load metadata
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata: TemplateMetadata = JSON.parse(metadataContent);

    // Determine target directory (Phase 1: Use PATHS constant)
    const targetDir = options.dir 
      ? path.resolve(process.cwd(), options.dir)
      : path.join(process.cwd(), PATHS.PROJECT_AGENTS_DIR);

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
        logger.info('Installation cancelled');
        throw new UserCancelledError('template installation');
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
    console.log(`💡 Cost estimate: $${metadata.estimatedCost.min.toFixed(2)}-$${metadata.estimatedCost.max.toFixed(2)}\n`);
  } catch (error) {
    logger.error('Failed to install template', { error });
    throw error;
  }
}

// Exports for CLI registration
export { showTemplateInfo as runTemplateInfo, installTemplate as runTemplateInstall, listTemplates as runTemplateList }

