import { Injectable } from '@nestjs/common';
import { Permission } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.TRANSACTIONS_ALL,
    Permission.CATEGORIES_ALL,
    Permission.BUDGETS_ALL,
    Permission.USERS_MANAGE,
    Permission.ROLES_MANAGE,
  ],
  [Role.USER]: [
    Permission.TRANSACTIONS_ALL,
    Permission.CATEGORIES_ALL,
    Permission.BUDGETS_ALL,
  ],
};

@Injectable()
export class RbacService {
  resolvePermissions(role: Role): string[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  hasPermission(role: Role, permission: Permission): boolean {
    return this.resolvePermissions(role).includes(permission);
  }
}
