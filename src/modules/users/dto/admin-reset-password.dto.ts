import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @ApiProperty({ example: 'NovaSenha@123' })
  @IsString()
  @MinLength(6, { message: 'Senha inválida' })
  password!: string;
}
