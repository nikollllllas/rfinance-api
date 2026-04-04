import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@rfinance.local' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;
}
