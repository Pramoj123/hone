import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role } from '@hone/database';

@Injectable()
export class OrgScopeGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const { user, params } = req;
    const slug = params.slug as string;

    if (!slug || !user) throw new ForbiddenException();

    const org = await prisma.organization.findUnique({
      where: { slug, deletedAt: null },
    });
    if (!org) throw new NotFoundException(`Gym "${slug}" not found`);

    if (user.role === Role.SUPER_ADMIN) {
      req.org = org;
      return true;
    }

    if (user.organizationId) {
      // ORG_ADMIN: linked directly to org
      if (user.organizationId !== org.id) throw new ForbiddenException();
    } else if (user.branchId) {
      // BRANCH_MANAGER / TRAINER / CLIENT: linked to branch, org is inferred
      const branch = await prisma.branch.findUnique({
        where: { id: user.branchId, deletedAt: null },
        select: { organizationId: true },
      });
      if (!branch || branch.organizationId !== org.id) throw new ForbiddenException();
    } else {
      throw new ForbiddenException();
    }

    req.org = org;
    return true;
  }
}
