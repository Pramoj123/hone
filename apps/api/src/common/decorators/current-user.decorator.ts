import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@hone/database';

export type CurrentUserType = Omit<User, 'passwordHash' | 'deletedAt'>;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserType => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserType }>();
    return request.user;
  }
);
