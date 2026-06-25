import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ActiveUser } from '../interfaces/active-user.interface.js';

export const CurrentUser = createParamDecorator(
  (data: keyof ActiveUser | undefined, ctx: ExecutionContext): ActiveUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user: ActiveUser = request.user;

    if (data) {
      return user[data];
    }

    return user;
  },
);
