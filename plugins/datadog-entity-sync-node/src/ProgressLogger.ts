import type { LoggerService } from '@backstage/backend-plugin-api';

export class ProgressLogger {
  private readonly logger: LoggerService;
  private startTime: number;
  private timestamp: number;

  constructor(logger: LoggerService) {
    this.logger = logger;
    this.startTime = this.timestamp = Date.now();
  }

  private restartTimer() {
    this.startTime = this.timestamp = Date.now();
  }

  public start(message: string) {
    this.restartTimer();
    this.log.info(message);
  }

  public get log() {
    return this.logger.child({
      stepTime: `${String(this.elapsedSinceLast)}ms`,
      totalTime: `${String(this.elapsedSinceStart)}ms`,
    });
  }

  public get elapsedSinceStart() {
    return Date.now() - this.startTime;
  }

  public get elapsedSinceLast() {
    const elapsed = Date.now() - this.timestamp;
    this.timestamp = Date.now();
    return elapsed;
  }
}
