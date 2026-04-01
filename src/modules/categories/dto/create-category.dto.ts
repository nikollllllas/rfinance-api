import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '../../../infrastructure/drizzle/schema';
import { IsBoolean, IsEnum, IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Alimentação' })
  @IsString()
  @MinLength(1, { message: 'Nome é obrigatório' })
  name!: string;

  @ApiProperty({ example: '#22C55E' })
  @IsHexColor({ message: 'Formato de cor inválido' })
  color!: string;

  @ApiPropertyOptional({ example: 'food' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ enum: CategoryType, example: CategoryType.GASTO })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
