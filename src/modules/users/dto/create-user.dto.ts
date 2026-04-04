import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(1, { message: 'Nome é obrigatório' })
  name!: string;

  @ApiProperty({ example: 'maria@rfinance.local' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @ApiProperty({ example: 'User@123' })
  @IsString()
  @MinLength(6, { message: 'Senha inválida' })
  password!: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @IsEnum(Role)
  role!: Role;
}
