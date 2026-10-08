import { ApiProperty } from '@nestjs/swagger';

export class AttachmentResponseDto {
  @ApiProperty({ example: 'uuid-attachment' })
  id!: string;

  @ApiProperty({ example: 'uuid-transaction' })
  transactionId!: string;

  @ApiProperty({ example: 'conta_de_luz.pdf' })
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 214532 })
  sizeBytes!: number;

  @ApiProperty({ example: '2026-08-05T12:00:00.000Z' })
  createdAt!: Date;
}

export class AttachmentDownloadResponseDto {
  @ApiProperty({ example: 'https://....r2.cloudflarestorage.com/...' })
  url!: string;

  @ApiProperty({ example: 'conta_de_luz.pdf' })
  fileName!: string;
}
