/**
 * Simple Promise Queue implementation
 * 
 * Lightweight alternative to p-queue that works with pkg bundler.
 * Provides basic concurrency control for async tasks.
 */

export interface QueueOptions {
  concurrency: number;
}

type Task<T> = () => Promise<T>;

export class SimpleQueue {
  private concurrency: number;
  private running = 0;
  private queue: Array<{
    task: Task<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(options: QueueOptions = { concurrency: 1 }) {
    this.concurrency = options.concurrency;
  }

  /**
   * Get current concurrency setting
   */
  get concurrencyLimit(): number {
    return this.concurrency;
  }

  /**
   * Update concurrency limit
   */
  set concurrencyLimit(value: number) {
    this.concurrency = Math.max(1, value);
    this.process();
  }

  /**
   * Get number of pending tasks
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Get number of currently running tasks
   */
  get pending(): number {
    return this.running;
  }

  /**
   * Add a task to the queue
   */
  async add<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  /**
   * Process queued tasks
   */
  private async process(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      this.running++;
      
      item.task()
        .then(result => {
          item.resolve(result);
        })
        .catch(error => {
          item.reject(error);
        })
        .finally(() => {
          this.running--;
          this.process();
        });
    }
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Wait for all running tasks to complete
   */
  async onIdle(): Promise<void> {
    while (this.running > 0 || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

// Export a default constructor for compatibility with p-queue API
export default SimpleQueue;
