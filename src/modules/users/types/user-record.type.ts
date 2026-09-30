import { Role } from '../../../common/enums/role.enum';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  tokenVersion: number;
  privacyAcceptedAt: Date | null;
  privacyPolicyVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
};
