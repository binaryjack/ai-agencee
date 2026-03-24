/**
 * AST Validator
 * Validates AST patches for syntax errors, type errors, and import resolution
 */

import * as ts from 'typescript'

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type AstValidatorInstance = {
  _compilerOptions: ts.CompilerOptions;
  validateAstPatch(sourceCode: string, filePath: string): ValidationResult;
  _checkSyntaxErrors(sourceFile: ts.SourceFile): ts.Diagnostic[];
  _checkSemanticErrors(sourceFile: ts.SourceFile, program: ts.Program): ts.Diagnostic[];
};

export const AstValidator = function(this: AstValidatorInstance) {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.React,
    allowJs: true,
    noEmit: true,
    strict: false, // Allow some flexibility for patches
    skipLibCheck:true
  };

  Object.defineProperty(this, '_compilerOptions', {
    enumerable: false,
    value: compilerOptions
  });
};

AstValidator.prototype.validateAstPatch = function(
  this: AstValidatorInstance,
  sourceCode: string,
  filePath: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Create source file
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true // setParentNodes
  );

  // Check syntax errors
  const syntaxErrors = this._checkSyntaxErrors(sourceFile);
  for (const diagnostic of syntaxErrors) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    errors.push(`Syntax error: ${message}`);
  }

  // If syntax is valid, check semantic errors
  if (syntaxErrors.length === 0) {
    // Create a minimal program for type checking
    const compilerHost = ts.createCompilerHost(this._compilerOptions);
    const originalGetSourceFile = compilerHost.getSourceFile;
    
    compilerHost.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (fileName === filePath) {
        return sourceFile;
      }
      return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    const program = ts.createProgram([filePath], this._compilerOptions, compilerHost);
    const semanticErrors = this._checkSemanticErrors(sourceFile, program);
    
    for (const diagnostic of semanticErrors) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      
      // Categorize as warning or error based on category
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        errors.push(`Type error: ${message}`);
      } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
        warnings.push(`Type warning: ${message}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

AstValidator.prototype._checkSyntaxErrors = function(
  this: AstValidatorInstance,
  sourceFile: ts.SourceFile
): ts.Diagnostic[] {
  return (sourceFile as any).parseDiagnostics || [];
};

AstValidator.prototype._checkSemanticErrors = function(
  this: AstValidatorInstance,
  sourceFile: ts.SourceFile,
  program: ts.Program
): ts.Diagnostic[] {
  const diagnostics: ts.Diagnostic[] = [];
  
  // Get semantic diagnostics (type errors, etc.)
  const semanticDiagnostics = program.getSemanticDiagnostics(sourceFile);
  diagnostics.push(...semanticDiagnostics);
  
  return diagnostics;
};
