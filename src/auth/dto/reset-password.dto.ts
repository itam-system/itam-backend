import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token!: string;

  @ApiProperty({ description: 'New password (min 8 chars, 1 uppercase, 1 number)' })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'New password must contain at least 1 uppercase letter and 1 number',
  })
  newPassword!: string;

  @ApiProperty({ description: 'Confirm new password (must match newPassword)' })
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword!: string;
}
