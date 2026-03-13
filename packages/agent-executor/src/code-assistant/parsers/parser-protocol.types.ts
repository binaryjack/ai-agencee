/**
 * Parser Protocol - Interface that all language parsers must implement
 */

export type ParserOptions = {
  filePath?: string;
  compilerOptions?: Record<string, unknown>;
  [key: string]: unknown;
};

export type Parser = {
  parse(content: string, context?: ParserOptions): Promise<unknown>;
  extractSymbols(ast: unknown): Promise<import('../indexer/codebase-indexer.types').Symbol[]>;
  extractImports(ast: unknown): Promise<import('../indexer/codebase-indexer.types').Import[]>;
  extractExports(ast: unknown): Promise<import('../indexer/codebase-indexer.types').Export[]>;
  typeCheck?(filePath: string): Promise<void>;
  addImport?(ast: unknown, importStatement: string): unknown;
  wrapFunction?(ast: unknown, functionName: string, wrapper: string): unknown;
  print?(ast: unknown, options?: PrintOptions): string;
};

export type PrintOptions = {
  preserveFormatting?: boolean;
  indentSize?: number;
  newLine?: string;
};

export type ParserRegistryOptions = {
  customParsers?: Record<string, Parser>;
};

export type FileParseResult = {
  filePath: string;
  language: string;
  hash: string;
  sizeBytes: number;
  symbols: import('../indexer/codebase-indexer.types').Symbol[];
  imports: import('../indexer/codebase-indexer.types').Import[];
  exports: import('../indexer/codebase-indexer.types').Export[];
};

