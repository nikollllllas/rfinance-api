import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteOwnAccountDto {
  @ApiProperty({ example: 'MinhaSenha@123' })
  @IsString()
  @MinLength(1)
  password!: string;
}
