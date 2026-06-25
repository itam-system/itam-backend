import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import {
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthResponseDto,
} from './dto/index.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─────────────────────────────────────────────
  // POST /auth/login
  // ─────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns access token, refresh token, and user info',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, ipAddress, userAgent);
    return {
      ...result.tokens,
      user: result.user,
    };
  }

  // ─────────────────────────────────────────────
  // POST /auth/logout
  // ─────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() currentUser: ActiveUser,
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    await this.authService.logout(currentUser, dto.refreshToken, ipAddress, userAgent);
    return { message: 'Successfully logged out' };
  }

  // ─────────────────────────────────────────────
  // POST /auth/refresh
  // ─────────────────────────────────────────────
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token (token rotation)' })
  @ApiResponse({
    status: 200,
    description: 'Returns new access and refresh token pair',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalid, expired, or revoked' })
  async refresh(@Req() req: Request) {
    const user = req.user as {
      userId: string;
      email: string;
      roleId: string;
      refreshToken: string;
    };
    const tokens = await this.authService.refreshTokens(
      user.userId,
      user.email,
      user.roleId,
      user.refreshToken,
    );
    return tokens;
  }

  // ─────────────────────────────────────────────
  // POST /auth/change-password
  // ─────────────────────────────────────────────
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or passwords do not match' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser() currentUser: ActiveUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    await this.authService.changePassword(currentUser, dto, ipAddress, userAgent);
    return { message: 'Password changed successfully. Please log in again.' };
  }

  // ─────────────────────────────────────────────
  // POST /auth/forgot-password
  // ─────────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset link',
    description: 'V1: Always returns success to prevent user enumeration. Email flow comes in V2.',
  })
  @ApiResponse({ status: 200, description: 'Reset link sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ─────────────────────────────────────────────
  // POST /auth/reset-password
  // ─────────────────────────────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'V1: Structure only. Full token validation comes in V2.',
  })
  @ApiResponse({ status: 200, description: 'Password reset result' })
  @ApiResponse({ status: 400, description: 'Passwords do not match' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
