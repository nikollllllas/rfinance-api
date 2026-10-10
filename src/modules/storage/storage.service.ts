import type { Readable } from 'node:stream';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../env';

const DOWNLOAD_URL_TTL_SECONDS = 300;

// Cloudflare R2: API compatível com S3, nunca expõe o bucket publicamente —
// toda leitura passa por URL assinada de curta duração.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client =
    env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
      ? new S3Client({
          region: 'auto',
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        })
      : null;

  isConfigured(): boolean {
    return this.client !== null;
  }

  private ensureClient(): S3Client {
    if (!this.client) {
      this.logger.warn('R2 não configurado — operação de anexo recusada');
      throw new ServiceUnavailableException(
        'Armazenamento de anexos não está configurado no momento',
      );
    }
    return this.client;
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    const client = this.ensureClient();
    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getSignedDownloadUrl(key: string, fileName: string): Promise<string> {
    const client = this.ensureClient();
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    return getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
  }

  async getObjectStream(key: string): Promise<Readable> {
    const client = this.ensureClient();
    const response = await client.send(
      new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    );
    return response.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
      );
    } catch (err) {
      this.logger.error(
        `Falha ao apagar objeto ${key} do R2`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
