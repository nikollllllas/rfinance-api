import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class ListBudgetsQueryDto {
  @ApiPropertyOptional({ example: '2026-03', description: 'Formato YYYY-MM' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato de mês inválido (YYYY-MM)' })
  month?: string;
}
