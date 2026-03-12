/**
 * Type definitions for TypeScriptParser
 */

import * as ts from 'typescript';
import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types';
import type { FileParseResult } from './parser-protocol.types';

export type TypeScriptParserInstance = {
  _language: string;
  extractSymbols(sourceCode: string, filePath: string): Symbol[];
  extractImports(sourceCode: string, filePath: string): Import[];
  extractExports(sourceCode: string, filePath: string): Export[];
  parse(sourceCode: string, filePath: string): FileParseResult;
  _isExported(node: ts.Node): boolean;
  _getLineNumber(sourceFile: ts.SourceFile, pos: number): number;
  _extractSignature(node: ts.Node, sourceFile: ts.SourceFile): string | null;
  _extractJSDoc(node: ts.Node): string | null;
  _classifyImport(specifier: string): 'local' | 'npm' | 'builtin';
  _isBuiltinModule(name: string): boolean;
  _hashContent(content: string): string;
};
