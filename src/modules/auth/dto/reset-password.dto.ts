import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'plain-text-recovery-token' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NovaSenha@123' })
  @IsString()
  @MinLength(6, { message: 'Senha inválida' })
  password!: string;
}
