/**
 * Progress Reporter for Code Indexing
 * Supports both JSON (machine-readable) and human-readable output formats
 */

export type ProgressPhase = 
  | 'discovery' 
  | 'parsing' 
  | 'indexing' 
  | 'embedding' 
  | 'complete';

export type ProgressEventType = 'progress' | 'complete' | 'error';

export interface IndexStats {
  files: number;
  symbols: number;
  deps: number;
  cost: number;
  duration: number;
}

export interface ProgressEvent {
  type: ProgressEventType;
  phase: ProgressPhase;
  current: number;
  total: number;
  file?: string;
  message?: string;
  stats?: IndexStats;
  error?: {
    message: string;
    filePath?: string;
    line?: number;
  };
}

export class ProgressReporter {
  private readonly jsonMode: boolean;

  constructor(jsonMode: boolean = false) {
    this.jsonMode = jsonMode;
  }

  emit(event: ProgressEvent): void {
    if (this.jsonMode) {
      this.emitJson(event);
    } else {
      this.emitHuman(event);
    }
  }

  private emitJson(event: ProgressEvent): void {
    // Emit as single-line JSON for easy parsing
    process.stdout.write(JSON.stringify(event) + '\n');
  }

  private emitHuman(event: ProgressEvent): void {
    switch (event.type) {
      case 'progress':
        this.emitProgressHuman(event);
        break;
      case 'complete':
        this.emitCompleteHuman(event);
        break;
      case 'error':
        this.emitErrorHuman(event);
        break;
    }
  }

  private emitProgressHuman(event: ProgressEvent): void {
    const percentage = event.total > 0 
      ? Math.round((event.current / event.total) * 100)
      : 0;
    
    switch (event.phase) {
      case 'discovery':
        console.log(`📁 Discovering files... ${event.current}/${event.total} (${percentage}%)`);
        break;
      case 'parsing':
        if (event.file) {
          // Show file being parsed (truncate if too long)
          const displayFile = event.file.length > 50 
            ? '...' + event.file.slice(-47)
            : event.file;
          console.log(`🔍 Parsing [${event.current}/${event.total}] ${displayFile}`);
        } else {
          console.log(`🔍 Parsing... ${event.current}/${event.total} (${percentage}%)`);
        }
        break;
      case 'indexing':
        console.log(`💾 Indexing symbols... ${event.current}/${event.total} (${percentage}%)`);
        break;
      case 'embedding':
        console.log(`🧠 Generating embeddings... ${event.current}/${event.total} (${percentage}%)`);
        break;
      case 'complete':
        // Handled by emitCompleteHuman
        break;
    }
    
    if (event.message) {
      console.log(`   ${event.message}`);
    }
  }

  private emitCompleteHuman(event: ProgressEvent): void {
    if (!event.stats) return;
    
    console.log(`\n✅ Indexing complete\n`);
    console.log(`📄 Files indexed: ${event.stats.files}`);
    console.log(`🔍 Symbols extracted: ${event.stats.symbols}`);
    console.log(`🔗 Dependencies tracked: ${event.stats.deps}`);
    console.log(`💰 Cost: $${event.stats.cost.toFixed(4)}`);
    console.log(`⏱️  Duration: ${event.stats.duration.toFixed(2)}s`);
  }

  private emitErrorHuman(event: ProgressEvent): void {
    if (event.error) {
      if (event.error.filePath) {
        const location = event.error.line 
          ? `${event.error.filePath}:${event.error.line}`
          : event.error.filePath;
        console.error(`❌ Error in ${location}: ${event.error.message}`);
      } else {
        console.error(`❌ Error: ${event.error.message}`);
      }
    } else if (event.message) {
      console.error(`❌ ${event.message}`);
    }
  }

  /**
   * Helper to emit a discovery phase event
   */
  discovery(current: number, total: number): void {
    this.emit({
      type: 'progress',
      phase: 'discovery',
      current,
      total
    });
  }

  /**
   * Helper to emit a parsing phase event
   */
  parsing(current: number, total: number, file?: string): void {
    this.emit({
      type: 'progress',
      phase: 'parsing',
      current,
      total,
      file
    });
  }

  /**
   * Helper to emit an indexing phase event
   */
  indexing(current: number, total: number): void {
    this.emit({
      type: 'progress',
      phase: 'indexing',
      current,
      total
    });
  }

  /**
   * Helper to emit an embedding phase event
   */
  embedding(current: number, total: number): void {
    this.emit({
      type: 'progress',
      phase: 'embedding',
      current,
      total
    });
  }

  /**
   * Helper to emit a completion event
   */
  complete(stats: IndexStats): void {
    this.emit({
      type: 'complete',
      phase: 'complete',
      current: stats.files,
      total: stats.files,
      stats
    });
  }

  /**
   * Helper to emit an error event
   */
  error(message: string, filePath?: string, line?: number): void {
    this.emit({
      type: 'error',
      phase: 'complete',
      current: 0,
      total: 0,
      error: {
        message,
        filePath,
        line
      }
    });
  }
}
