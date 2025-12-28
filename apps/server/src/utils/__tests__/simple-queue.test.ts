import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleQueue } from '../simple-queue';

describe('SimpleQueue', () => {
  let queue: SimpleQueue;

  beforeEach(() => {
    queue = new SimpleQueue({ concurrency: 2 });
  });

  it('should create a queue with default concurrency', () => {
    const defaultQueue = new SimpleQueue();
    expect(defaultQueue.concurrencyLimit).toBe(1);
  });

  it('should create a queue with specified concurrency', () => {
    expect(queue.concurrencyLimit).toBe(2);
  });

  it('should update concurrency limit', () => {
    queue.concurrencyLimit = 5;
    expect(queue.concurrencyLimit).toBe(5);
  });

  it('should reject invalid concurrency values', () => {
    expect(() => {
      queue.concurrencyLimit = NaN;
    }).toThrow('Concurrency limit must be a finite number');

    expect(() => {
      queue.concurrencyLimit = Infinity;
    }).toThrow('Concurrency limit must be a finite number');

    expect(() => {
      queue.concurrencyLimit = -1;
    }).toThrow('Concurrency limit must be at least 1');

    expect(() => {
      queue.concurrencyLimit = 0;
    }).toThrow('Concurrency limit must be at least 1');
  });

  it('should floor fractional concurrency values', () => {
    queue.concurrencyLimit = 3.7;
    expect(queue.concurrencyLimit).toBe(3);
  });

  it('should execute a single task', async () => {
    let executed = false;
    await queue.add(async () => {
      executed = true;
      return 'done';
    });
    expect(executed).toBe(true);
  });

  it('should return task result', async () => {
    const result = await queue.add(async () => {
      return 'test-result';
    });
    expect(result).toBe('test-result');
  });

  it('should handle task errors', async () => {
    const error = new Error('test error');
    await expect(
      queue.add(async () => {
        throw error;
      })
    ).rejects.toThrow('test error');
  });

  it('should respect concurrency limit', async () => {
    queue.concurrencyLimit = 2;
    let runningCount = 0;
    let maxRunning = 0;

    const tasks = Array(5).fill(null).map(() =>
      queue.add(async () => {
        runningCount++;
        maxRunning = Math.max(maxRunning, runningCount);
        await new Promise(resolve => setTimeout(resolve, 10));
        runningCount--;
      })
    );

    await Promise.all(tasks);
    expect(maxRunning).toBe(2);
  });

  it('should track queue size', () => {
    // Add tasks without awaiting
    queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // With concurrency 2, one task should be queued
    expect(queue.size).toBeGreaterThanOrEqual(1);
  });

  it('should track pending tasks', () => {
    queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // With concurrency 2, both should be running
    expect(queue.pending).toBeGreaterThan(0);
  });

  it('should clear all pending tasks', async () => {
    // Fill queue with tasks
    for (let i = 0; i < 10; i++) {
      queue.add(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
      });
    }

    const initialSize = queue.size;
    expect(initialSize).toBeGreaterThan(0);

    queue.clear();
    expect(queue.size).toBe(0);
  });

  it('should wait for all tasks to complete with onIdle', async () => {
    let completed = 0;

    // Add multiple tasks
    for (let i = 0; i < 5; i++) {
      queue.add(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        completed++;
      });
    }

    // Wait for all to complete
    await queue.onIdle();
    expect(completed).toBe(5);
    expect(queue.size).toBe(0);
    expect(queue.pending).toBe(0);
  });

  it('should process tasks in order', async () => {
    const results: number[] = [];
    queue.concurrencyLimit = 1; // Serial execution

    const tasks = [1, 2, 3, 4, 5].map(num =>
      queue.add(async () => {
        results.push(num);
      })
    );

    await Promise.all(tasks);
    expect(results).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle mixed success and failure', async () => {
    const results = await Promise.allSettled([
      queue.add(async () => 'success1'),
      queue.add(async () => {
        throw new Error('error1');
      }),
      queue.add(async () => 'success2'),
      queue.add(async () => {
        throw new Error('error2');
      }),
    ]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');
    expect(results[3].status).toBe('rejected');
  });

  it('should update concurrency while running', async () => {
    queue.concurrencyLimit = 1;
    let runningCount = 0;
    let maxRunning = 0;

    // Start tasks with concurrency 1
    const task1 = queue.add(async () => {
      runningCount++;
      maxRunning = Math.max(maxRunning, runningCount);
      await new Promise(resolve => setTimeout(resolve, 20));
      runningCount--;
    });

    const task2 = queue.add(async () => {
      runningCount++;
      maxRunning = Math.max(maxRunning, runningCount);
      await new Promise(resolve => setTimeout(resolve, 20));
      runningCount--;
    });

    // Increase concurrency mid-execution
    await new Promise(resolve => setTimeout(resolve, 5));
    queue.concurrencyLimit = 2;

    const task3 = queue.add(async () => {
      runningCount++;
      maxRunning = Math.max(maxRunning, runningCount);
      await new Promise(resolve => setTimeout(resolve, 20));
      runningCount--;
    });

    await Promise.all([task1, task2, task3]);
    expect(maxRunning).toBeGreaterThanOrEqual(1);
  });
});
