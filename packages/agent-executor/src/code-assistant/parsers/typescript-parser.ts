/**
 * TypeScript Parser - Uses TypeScript Compiler API
 * Extracts symbols, imports, exports with full type information
 */

import * as ts from 'typescript';
import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types';
import type { ParserOptions, PrintOptions } from './parser-protocol.types';

export type TypeScriptParserInstance = {
  _compilerOptions: ts.CompilerOptions;
  parse(content: string, context?: ParserOptions): Promise<ts.SourceFile>;
  extractSymbols(ast: ts.SourceFile): Promise<Symbol[]>;
  extractImports(ast: ts.SourceFile): Promise<Import[]>;
  extractExports(ast: ts.SourceFile): Promise<Export[]>;
  _isExported(node: ts.Node): boolean;
  _getLineNumber(sourceFile: ts.SourceFile, pos: number): number;
  _extractSignature(node: ts.Node, sourceFile: ts.SourceFile): string | null;
  _extractJSDoc(node: ts.Node): string | null;
  _classifyImport(specifier: string): 'local' | 'npm' | 'builtin';
  _isBuiltinModule(name: string): boolean;
  print(ast: ts.SourceFile, options?: PrintOptions): string;
};

export const TypeScriptParser = function(this: TypeScriptParserInstance, options: ParserOptions = {}) {
  const {
    compilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      allowJs: true
    }
  } = options;
  
  Object.defineProperty(this, '_compilerOptions', {
    enumerable: false,
    value: compilerOptions
  });
};

TypeScriptParser.prototype.parse = async function(this: TypeScriptParserInstance, content: string, context: ParserOptions = {}): Promise<ts.SourceFile> {
  const sourceFile = ts.createSourceFile(
    context.filePath || 'temp.ts',
    content,
    ts.ScriptTarget.Latest,
    true // setParentNodes
  );
  
  return sourceFile;
};

TypeScriptParser.prototype.extractSymbols = async function(this: TypeScriptParserInstance, ast: ts.SourceFile): Promise<Symbol[]> {
  const symbols: Symbol[] = [];
  
  const visit = (node: ts.Node): void => {
    // Functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      symbols.push({
        name: node.name.text,
        kind: 'function',
        lineStart: this._getLineNumber(ast, node.pos),
        lineEnd: this._getLineNumber(ast, node.end),
        signature: this._extractSignature(node, ast) || undefined,
        docstring: this._extractJSDoc(node) || undefined,
        isExported: this._isExported(node)
      });
    }
    
    // Arrow functions assigned to const
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach(decl => {
        if (decl.initializer && 
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          symbols.push({
            name: decl.name.getText(ast),
            kind: 'function',
            lineStart: this._getLineNumber(ast, decl.pos),
            lineEnd: this._getLineNumber(ast, decl.end),
          signature: this._extractSignature(decl.initializer, ast) || undefined,
          docstring: this._extractJSDoc(node) || undefined,
            isExported: this._isExported(node)
          });
        }
      });
    }
    
    // Classes
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const methodMembers = node.members.filter(
        (member): member is ts.MethodDeclaration =>
          ts.isMethodDeclaration(member) && member.name !== undefined
      );
      const methods = methodMembers.map(method => method.name!.getText(ast));

      symbols.push({
        name: className,
        kind: 'class',
        lineStart: this._getLineNumber(ast, node.pos),
        lineEnd: this._getLineNumber(ast, node.end),
        docstring: this._extractJSDoc(node) || undefined,
        isExported: this._isExported(node),
        methods
      });

      // Emit each method as an individual symbol so the store can index and search them
      for (const member of methodMembers) {
        const methodName = member.name!.getText(ast);
        symbols.push({
          name: `${className}.${methodName}`,
          kind: 'method',
          lineStart: this._getLineNumber(ast, member.pos),
          lineEnd: this._getLineNumber(ast, member.end),
          signature: this._extractSignature(member, ast) || undefined,
          docstring: this._extractJSDoc(member) || undefined,
          isExported: false
        });
      }
    }
    
    // Interfaces
    if (ts.isInterfaceDeclaration(node)) {
      symbols.push({
        name: node.name.text,
        kind: 'interface',
        lineStart: this._getLineNumber(ast, node.pos),
        lineEnd: this._getLineNumber(ast, node.end),
        isExported: this._isExported(node)
      });
    }
    
    // Type aliases
    if (ts.isTypeAliasDeclaration(node)) {
      symbols.push({
        name: node.name.text,
        kind: 'type',
        lineStart: this._getLineNumber(ast, node.pos),
        lineEnd: this._getLineNumber(ast, node.end),
        isExported: this._isExported(node)
      });
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(ast);
  return symbols;
};

TypeScriptParser.prototype.extractImports = async function(this: TypeScriptParserInstance, ast: ts.SourceFile): Promise<Import[]> {
  const imports: Import[] = [];
  
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleSpecifier = node.moduleSpecifier.text;
      const namedImports = [];
      
      if (node.importClause) {
        // Default import
        if (node.importClause.name) {
          namedImports.push(node.importClause.name.text);
        }
        
        // Named imports
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(el => {
              namedImports.push(el.name.text);
            });
          }
          // Namespace import
          else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            namedImports.push(node.importClause.namedBindings.name.text);
          }
        }
      }
      
      imports.push({
        specifier: moduleSpecifier,
        type: this._classifyImport(moduleSpecifier),
        names: namedImports
      });
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(ast);
  return imports;
};

TypeScriptParser.prototype.extractExports = async function(this: TypeScriptParserInstance, ast: ts.SourceFile): Promise<Export[]> {
  const exports: Export[] = [];
  
  const visit = (node: ts.Node): void => {
    if (this._isExported(node)) {
      let name: string | undefined;
      let kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | null = null;
      
      if (ts.isFunctionDeclaration(node)) {
        name = node.name?.text;
        kind = 'function';
      } else if (ts.isClassDeclaration(node)) {
        name = node.name?.text;
        kind = 'class';
      } else if (ts.isInterfaceDeclaration(node)) {
        name = node.name?.text;
        kind = 'interface';
      } else if (ts.isTypeAliasDeclaration(node)) {
        name = node.name?.text;
        kind = 'type';
      } else if (ts.isVariableStatement(node)) {
        // Get variable names
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            exports.push({
              name: decl.name.text,
              kind: 'variable'
            });
          }
        });
        return; // Already handled
      }
      
      if (name && kind) {
        exports.push({ name, kind: kind as 'function' | 'class' | 'interface' | 'type' | 'variable' });
      }
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(ast);
  return exports;
};

TypeScriptParser.prototype._isExported = function(this: TypeScriptParserInstance, node: ts.Node): boolean {
  const modifiers = (node as any).modifiers as ts.ModifierLike[] | undefined;
  return modifiers?.some((m: ts.ModifierLike) => 
    (m as ts.Modifier).kind === ts.SyntaxKind.ExportKeyword
  ) || false;
};

TypeScriptParser.prototype._getLineNumber = function(this: TypeScriptParserInstance, sourceFile: ts.SourceFile, pos: number): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(pos);
  return line + 1;
};

TypeScriptParser.prototype._extractSignature = function(this: TypeScriptParserInstance, node: ts.Node, sourceFile: ts.SourceFile): string | null {
  // Extract the function signature as text
  const text = node.getText(sourceFile);
  const lines = text.split('\n');
  
  // For functions and methods, extract up to the opening brace
  if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node)) {
    // Find opening brace
    const braceIndex = text.indexOf('{');
    if (braceIndex > 0) {
      return text.substring(0, braceIndex).trim();
    }
    return lines[0].trim();
  }
  
  return null;
};

TypeScriptParser.prototype._extractJSDoc = function(this: TypeScriptParserInstance, node: ts.Node): string | null {
  const jsDocTags = ts.getJSDocCommentsAndTags(node);
  if (jsDocTags.length === 0) return null;
  
  let docText = '';
  
  jsDocTags.forEach(tag => {
    if (ts.isJSDoc(tag)) {
      const comment = tag.comment;
      if (typeof comment === 'string') {
        docText += comment + '\n';
      }
    }
  });
  
  return docText.trim() || null;
};

TypeScriptParser.prototype._classifyImport = function(this: TypeScriptParserInstance, specifier: string): 'local' | 'npm' | 'builtin' {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    return 'local';
  }
  if (specifier.startsWith('node:') || this._isBuiltinModule(specifier)) {
    return 'builtin';
  }
  return 'npm';
};

TypeScriptParser.prototype._isBuiltinModule = function(this: TypeScriptParserInstance, name: string): boolean {
  const builtins = [
    'fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'events',
    'stream', 'buffer', 'url', 'querystring', 'assert', 'child_process'
  ];
  return builtins.includes(name);
};

TypeScriptParser.prototype.print = function(this: TypeScriptParserInstance, ast: ts.SourceFile, options: PrintOptions = {}): string {
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false
  });
  
  return printer.printFile(ast);
};
