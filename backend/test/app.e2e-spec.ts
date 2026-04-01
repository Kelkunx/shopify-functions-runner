import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('RunController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
        expect(body.success).toBe(true);
        expect(body.errors).toEqual([]);
        expect(body.output).toMatchObject({
          mockRunner: true,
          functionType: 'product-discount',
        });
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
