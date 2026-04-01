import { ApiProperty } from '@nestjs/swagger';
import { IsIn, Matches } from 'class-validator';

export class ReplicateBudgetsDto {
  @ApiProperty({ example: 'replicate' })
  @IsIn(['replicate'], { message: 'Ação não reconhecida' })
  action!: 'replicate';

  @ApiProperty({ example: '2026-04' })
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato de mês inválido (YYYY-MM)' })
  targetMonth!: string;
}
