import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class UpdateUserByAdminDto {
  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nome é obrigatório' })
  name?: string;

  @ApiPropertyOptional({ example: 'maria@rfinance.local' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
