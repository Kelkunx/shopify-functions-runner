import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app.setup';
import { AppModule } from './../src/app.module';

interface RunResponseBody {
  success: boolean;
  errors: string[];
  output: Record<string, unknown>;
}

describe('RunController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/run (POST)', () => {
    return request(app.getHttpServer())
      .post('/run')
      .field(
        'inputJson',
        JSON.stringify({
          cart: {
            lines: [{ id: 'gid://shopify/CartLine/1' }],
          },
        }),
      )
      .field('functionType', 'product-discount')
      .attach('wasm', Buffer.from('wasm'), 'function.wasm')
      .expect(200)
      .expect(({ body }) => {
        const responseBody = body as RunResponseBody;

        expect(responseBody.success).toBe(true);
        expect(responseBody.errors).toEqual([]);
        expect(responseBody.output).toMatchObject({
          mockRunner: true,
          functionType: 'product-discount',
        });
      });
  });

  it('/run (POST) rejects requests with missing inputJson', () => {
    return request(app.getHttpServer())
      .post('/run')
      .field('functionType', 'product-discount')
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(
          expect.arrayContaining([
            'inputJson must be longer than or equal to 1 characters',
          ]),
        );
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
