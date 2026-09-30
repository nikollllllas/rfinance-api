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
  @ApiProperty({ type: () => UserSummaryDto })
  user!: UserSummaryDto;
}

export class MeUserDto extends UserSummaryDto {
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  privacyAcceptedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  privacyPolicyVersion!: string | null;
}

export class MeResponseDto {
  @ApiProperty({ type: () => MeUserDto })
  user!: MeUserDto;
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
