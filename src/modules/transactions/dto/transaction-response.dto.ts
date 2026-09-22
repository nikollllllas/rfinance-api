import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentMethod,
  TransactionTag,
  TransactionType,
} from '../../../infrastructure/drizzle/schema';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';

export class TransactionResponseDto {
  @ApiProperty({ example: 'uuid-transaction' })
  id!: string;

  @ApiProperty({ example: 'uuid-user' })
  userId!: string;

  @ApiProperty({ example: 'Supermercado' })
  description!: string;

  @ApiProperty({ example: '145.90', description: 'Valor decimal como string' })
  amount!: string;

  @ApiProperty({ example: '2026-03-31T00:00:00.000Z' })
  date!: Date;

  @ApiPropertyOptional({ type: String, example: 'Compra mensal', nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: TransactionType, example: 'GASTO' })
  type!: TransactionType;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ example: 'uuid-category' })
  categoryId!: string;

  @ApiPropertyOptional({ enum: TransactionTag, nullable: true })
  tag!: TransactionTag | null;

  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  paymentMethod!: PaymentMethod | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Preenchido quando parte de um parcelamento',
  })
  installmentGroupId!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  installmentIndex!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  installmentCount!: number | null;

  @ApiProperty({ type: () => CategoryResponseDto })
  category!: CategoryResponseDto;
}

export class TransactionListResponseDto {
  @ApiProperty({ type: () => [TransactionResponseDto] })
  transactions!: TransactionResponseDto[];
}
