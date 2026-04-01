import { Module } from '@nestjs/common';
import { RunController } from './run.controller';
import { RunRequestParserService } from './run-request-parser.service';
import { RunService } from './run.service';
import { ShopifyFunctionRunnerService } from './shopify-function-runner.service';

@Module({
  controllers: [RunController],
  providers: [
    RunRequestParserService,
    RunService,
    ShopifyFunctionRunnerService,
  ],
})
export class RunModule {}
