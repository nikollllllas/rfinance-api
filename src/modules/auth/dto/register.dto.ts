import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(1, { message: 'Nome é obrigatório' })
  name!: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(6, { message: 'A senha precisa ter ao menos 6 caracteres' })
  password!: string;
}
