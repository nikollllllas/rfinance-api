import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class DashboardQueryDto {
  @ApiPropertyOptional({ example: '2026-03', description: 'Formato YYYY-MM' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Formato de mês inválido (YYYY-MM)' })
  month?: string;
}
