import { Module } from '@nestjs/common';
import { RunController } from './run.controller';
import { RunService } from './run.service';
import { ShopifyFunctionRunnerService } from './shopify-function-runner.service';

@Module({
  controllers: [RunController],
  providers: [RunService, ShopifyFunctionRunnerService],
})
export class RunModule {}
