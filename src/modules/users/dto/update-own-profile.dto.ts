import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateOwnProfileDto {
  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nome é obrigatório' })
  name?: string;

  @ApiPropertyOptional({ example: 'maria@rfinance.local' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;
}
