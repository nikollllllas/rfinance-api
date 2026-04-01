import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentMethod,
  TransactionTag,
  TransactionType,
  type PaymentMethod as PaymentMethodType,
  type TransactionTag as TransactionTagType,
  type TransactionType as TransactionTypeValue,
} from '../../../infrastructure/drizzle/schema';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: 'Supermercado' })
  @IsString()
  @MinLength(1, { message: 'Descrição é obrigatória' })
  description!: string;

  @ApiProperty({ example: 145.9 })
  @IsNumber({}, { message: 'Valor precisa ser um número válido' })
  amount!: number;

  @ApiProperty({ example: '2026-03-31T00:00:00.000Z' })
  @IsDateString({}, { message: 'Data inválida' })
  date!: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.GASTO })
  @IsEnum(TransactionType)
  type!: TransactionTypeValue;

  @ApiProperty({ example: 'uuid-category' })
  @IsUUID('4', { message: 'Categoria inválida' })
  categoryId!: string;

  @ApiPropertyOptional({ example: 'Compra mensal' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: TransactionTag, nullable: true })
  @IsOptional()
  @IsEnum(TransactionTag)
  tag?: TransactionTagType | null;

  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethodType;

  @ApiPropertyOptional({ example: 3, minimum: 2, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(12)
  installmentCount?: number;
}
