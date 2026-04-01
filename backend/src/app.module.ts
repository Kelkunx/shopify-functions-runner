import { Module } from '@nestjs/common';
import { RunModule } from './run/run.module';

@Module({
  imports: [RunModule],
})
export class AppModule {}
