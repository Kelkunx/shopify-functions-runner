import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RunRequestDto } from './dto/run-request.dto';
import { RunService } from './run.service';
import { type RunResponse } from './types/run-response.type';

interface UploadedWasmFile {
  originalname?: string;
  size?: number;
  buffer?: Buffer;
}

@Controller()
export class RunController {
  constructor(private readonly runService: RunService) {}

  @Post('run')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('wasm'))
  async run(
    @UploadedFile() wasmFile: UploadedWasmFile | undefined,
    @Body() body: RunRequestDto,
  ): Promise<RunResponse> {
    return this.runService.runFunction({
      wasmFile,
      inputJson: body.inputJson ?? '',
      functionType: body.functionType ?? '',
      functionDir: body.functionDir,
      target: body.target,
      exportName: body.exportName,
    });
  }
}
