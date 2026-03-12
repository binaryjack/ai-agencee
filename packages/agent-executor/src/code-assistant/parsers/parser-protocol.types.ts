/**
 * Parser Protocol - Interface that all language parsers must implement
 */

export type ParserOptions = {
  filePath?: string;
  compilerOptions?: any;
  [key: string]: any;
};

export type Parser = {
  parse: (content: string, context?: ParserOptions) => Promise<any>;
  extractSymbols: (ast: any) => Promise<import('../indexer/codebase-indexer.types').Symbol[]>;
  extractImports: (ast: any) => Promise<import('../indexer/codebase-indexer.types').Import[]>;
  extractExports: (ast: any) => Promise<import('../indexer/codebase-indexer.types').Export[]>;
  typeCheck?: (filePath: string) => Promise<void>;
  addImport?: (ast: any, importStatement: string) => any;
  wrapFunction?: (ast: any, functionName: string, wrapper: string) => any;
  print?: (ast: any, options?: PrintOptions) => string;
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

