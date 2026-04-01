import { Injectable } from '@nestjs/common';
import { UserRecord } from './types/user-record.type';

@Injectable()
export class UsersRepository {
  findByEmail(_email: string): Promise<UserRecord | null> {
    throw new Error('Not implemented');
  }

  findById(_id: string): Promise<UserRecord | null> {
    throw new Error('Not implemented');
  }
}
