import type {
  SchedulerServiceTaskFunction,
  SchedulerServiceTaskRunner,
  LoggerService,
} from '@backstage/backend-plugin-api';

import { ProgressLogger } from './ProgressLogger';

export interface BaseScheduledSyncOptions {
  syncId: string;
  taskRunner: SchedulerServiceTaskRunner;
  logger: LoggerService;
}

export abstract class BaseScheduledSync {
  protected readonly syncId: string;
  protected readonly abortController: AbortController;

  protected readonly taskRunner: SchedulerServiceTaskRunner;
  protected readonly tracker: ProgressLogger;
  protected readonly logger: LoggerService;

  constructor({ logger, taskRunner, syncId }: BaseScheduledSyncOptions) {
    this.syncId = syncId;
    this.taskRunner = taskRunner;
    this.abortController = new AbortController();

    this.logger = logger.child({
      sync: this.syncId,
    });

    this.tracker = new ProgressLogger(this.logger);
    void this.schedule();
  }

  protected getSyncName() {
    return this.syncId;
  }

  private async schedule() {
    try {
      this.logger.info(`Scheduling sync of ${this.syncId}.`);
      await this.taskRunner.run({
        id: this.syncId,
        fn: this.scheduledSyncTrigger.bind(this),
        signal: this.abortController.signal,
      });
    } catch (err) {
      if (err instanceof Error)
        this.logger.error('Could not properly schedule a background sync', err);
    }
  }

  public stop() {
    this.logger.info(`Aborting sync for ${this.syncId}.`);
    this.abortController.abort();
  }

  private async scheduledSyncTrigger(
    ...args: Parameters<SchedulerServiceTaskFunction>
  ) {
    this.tracker.start(`Running sync for ${this.syncId}`);

    try {
      await this.scheduledSync(...args);
    } catch (err) {
      if (err instanceof Error)
        this.tracker.log.error(
          `Items could not be synced due to an error.`,
          err,
        );
    }

    this.tracker.log.info(`Finished sync for ${this.syncId}`);
  }

  public abstract scheduledSync(
    ...args: Parameters<SchedulerServiceTaskFunction>
  ): ReturnType<SchedulerServiceTaskFunction>;
}
