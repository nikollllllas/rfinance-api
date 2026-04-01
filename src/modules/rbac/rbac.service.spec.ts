import { Permission } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum';
import { RbacService } from './rbac.service';

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(() => {
    service = new RbacService();
  });

  it('deve resolver permissões por role', () => {
    const permissions = service.resolvePermissions(Role.ADMIN);
    expect(permissions).toContain(Permission.TRANSACTIONS_ALL);
    expect(permissions).toContain(Permission.USERS_MANAGE);
  });

  it('deve negar role sem permissão', () => {
    const hasPermission = service.hasPermission(Role.USER, Permission.USERS_MANAGE);
    expect(hasPermission).toBe(false);
  });
});
