import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import type { ActiveUser } from '../../common/interfaces/active-user.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secretOrKey = configService.get<string>('jwt.accessSecret', 'fallback-secret');
    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    };
    super(options);
  }

  validate(payload: JwtPayload): ActiveUser {
    return {
      userId: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
    };
  }
}
