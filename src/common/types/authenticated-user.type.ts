import { Role } from '../enums/role.enum';

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: Role;
  permissions: string[];
};
