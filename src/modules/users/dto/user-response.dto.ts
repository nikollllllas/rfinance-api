import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid-user' })
  id!: string;

  @ApiProperty({ example: 'Administrador' })
  name!: string;

  @ApiProperty({ example: 'admin@rfinance.local' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role!: Role;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ListUsersResponseDto {
  @ApiProperty({ type: () => [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  perPage!: number;

  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}
