interface Waiter {
  resolve: (release: () => void) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Simple async semaphore for limiting concurrent async work (e.g. Discord API calls).
 */
export class AsyncSemaphore {
  private active = 0;
  private readonly waiters: Waiter[] = [];

  constructor(
    private readonly max: number,
    private readonly acquireTimeoutMs: number,
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active += 1;
      return Promise.resolve(() => this.release());
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiters.findIndex((entry) => entry.timeout === timeout);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        reject(new Error("ACTION_QUEUE_TIMEOUT"));
      }, this.acquireTimeoutMs);
      this.waiters.push({
        resolve: (release) => {
          clearTimeout(timeout);
          resolve(release);
        },
        reject,
        timeout,
      });
    });
  }

  private release(): void {
    this.active -= 1;
    const next = this.waiters.shift();
    if (next) {
      clearTimeout(next.timeout);
      this.active += 1;
      next.resolve(() => this.release());
    }
  }
}
