import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class UserSummaryDto {
  @ApiProperty({ example: 'uuid-user' })
  id!: string;

  @ApiProperty({ example: 'Administrador' })
  name!: string;

  @ApiProperty({ example: 'admin@rfinance.local' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role!: Role;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'jwt.token.value' })
  accessToken!: string;

  @ApiProperty({ type: () => UserSummaryDto })
  user!: UserSummaryDto;
}

export class MeResponseDto {
  @ApiProperty({ type: () => UserSummaryDto })
  user!: UserSummaryDto;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Só presente fora de produção, pra facilitar testes locais',
  })
  resetToken?: string;
}
