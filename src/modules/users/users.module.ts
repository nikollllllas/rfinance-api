import { Module } from '@nestjs/common';
import { DrizzleUsersRepository } from './drizzle-users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

const usersRepositoryProvider = {
  provide: UsersRepository,
  useClass: DrizzleUsersRepository,
};

@Module({
  controllers: [UsersController],
  providers: [usersRepositoryProvider, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
