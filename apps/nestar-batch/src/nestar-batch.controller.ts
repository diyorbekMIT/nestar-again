import { Controller, Get, Logger } from '@nestjs/common';

import { Cron, CronExpression, Timeout } from '@nestjs/schedule';

import { BatchService } from './nestar-batch.service';
import { BATCH_ROLLBACK, BATCH_TOP_AGENTS, BATCH_TOP_PROPERTIES } from './libs/config';

@Controller()
export class BatchController {
    private logger: Logger = new Logger('BatchController');

  constructor(private readonly batchService: BatchService) {}

  @Timeout(1000)
  handleTimeout() {
    this.logger.debug('BATCH SERVER READY');
  }

  @Cron(CronExpression.EVERY_10_SECONDS, { name: BATCH_ROLLBACK })

  public async batchRollback() {
    try {
      this.logger['context'] = BATCH_ROLLBACK;
      this.logger.debug('EXECUTED!')
      await this.batchService.batchRollback();
    } catch (err) {
      this.logger.error(err);
    }
  }

   @Cron('20 00 01 * * *', { name: BATCH_TOP_PROPERTIES })
  public async batchTopProperties() {
    try {
      this.logger['context'] = BATCH_TOP_PROPERTIES;
      this.logger.debug('EXECUTED!')
       await this.batchService.batchTopProperties();
    } catch (err) {
      this.logger.error(err);
    }
  }

   @Cron('40 00 01 * * *', { name: BATCH_TOP_AGENTS })
  public async batchTopAgents() {
    try {
      this.logger['context'] = BATCH_TOP_AGENTS;
      this.logger.debug('EXECUTED!')
       await this.batchService.batchTopAgents();
    } catch (err) {
      this.logger.error(err);
    }
  }
}