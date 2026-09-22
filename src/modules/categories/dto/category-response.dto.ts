import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '../../../infrastructure/drizzle/schema';

export class CategoryResponseDto {
  @ApiProperty({ example: 'uuid-category' })
  id!: string;

  @ApiProperty({ example: 'uuid-user' })
  userId!: string;

  @ApiProperty({ example: 'Alimentação' })
  name!: string;

  @ApiProperty({ example: '#22C55E' })
  color!: string;

  @ApiPropertyOptional({ type: String, example: 'food', nullable: true })
  icon!: string | null;

  @ApiProperty({ example: false })
  isDefault!: boolean;

  @ApiPropertyOptional({ enum: CategoryType, nullable: true })
  type!: CategoryType | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
