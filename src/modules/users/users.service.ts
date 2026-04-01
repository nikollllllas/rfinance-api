import { Injectable } from '@nestjs/common';
import { UserRecord } from './types/user-record.type';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.usersRepository.findByEmail(email);
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.usersRepository.findById(id);
  }
}
