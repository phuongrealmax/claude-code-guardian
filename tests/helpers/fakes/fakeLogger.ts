// tests/helpers/fakes/fakeLogger.ts

/**
 * Fake Logger for testing - records all log calls
 */
export class FakeLogger {
  public logs: Array<{ level: string; message: string; args: unknown[] }> = [];

  debug(message: string, ...args: unknown[]): void {
    this.logs.push({ level: 'debug', message, args });
  }

  info(message: string, ...args: unknown[]): void {
    this.logs.push({ level: 'info', message, args });
  }

  warn(message: string, ...args: unknown[]): void {
    this.logs.push({ level: 'warn', message, args });
  }

  error(message: string, ...args: unknown[]): void {
    this.logs.push({ level: 'error', message, args });
  }

  setLevel(_level: string): void {
    // No-op for fake
  }

  child(_name: string): FakeLogger {
    return this;
  }

  clear(): void {
    this.logs = [];
  }

  getByLevel(level: string): Array<{ message: string; args: unknown[] }> {
    return this.logs.filter(l => l.level === level);
  }

  hasMessage(message: string): boolean {
    return this.logs.some(l => l.message.includes(message));
  }
}
