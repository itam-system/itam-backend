import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
  StrategyOptionsWithRequest,
} from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const secretOrKey = configService.get<string>('jwt.refreshSecret', 'fallback-refresh-secret');
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey,
      passReqToCallback: true,
    };
    super(options);
  }

  validate(
    req: Request,
    payload: JwtPayload,
  ): { userId: string; email: string; roleId: string; refreshToken: string } {
    const refreshToken = req.body.refreshToken as string;
    return {
      userId: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      refreshToken,
    };
  }
}
