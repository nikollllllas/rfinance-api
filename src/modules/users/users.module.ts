import { Module } from '@nestjs/common';
import { DrizzleUsersRepository } from './drizzle-users.repository';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

const usersRepositoryProvider = {
  provide: UsersRepository,
  useClass: DrizzleUsersRepository,
};

@Module({
  providers: [usersRepositoryProvider, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
