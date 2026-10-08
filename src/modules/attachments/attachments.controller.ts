import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { env } from '../../env';
import { AttachmentsService } from './attachments.service';
import {
  AttachmentDownloadResponseDto,
  AttachmentResponseDto,
} from './dto/attachment-response.dto';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('transactions/:transactionId/attachments')
export class TransactionAttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ type: AttachmentResponseDto })
  @ApiResponse({ status: 404, description: 'Transação não encontrada' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou maior que o limite' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: env.ATTACHMENT_MAX_SIZE_MB * 1024 * 1024 },
    }),
  )
  upload(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.attachmentsService.upload(transactionId, user.userId, file);
  }

  @Get()
  @ApiOkResponse({ type: AttachmentResponseDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Transação não encontrada' })
  list(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.list(transactionId, user.userId);
  }
}

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':id/download')
  @ApiOkResponse({
    type: AttachmentDownloadResponseDto,
    description: 'URL assinada, válida por 5 minutos',
  })
  @ApiResponse({ status: 404, description: 'Anexo não encontrado' })
  getDownloadUrl(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.getDownloadUrl(id, user.userId);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiResponse({ status: 404, description: 'Anexo não encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.remove(id, user.userId);
  }
}
