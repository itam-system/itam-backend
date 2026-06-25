import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '../constants/error-codes.constant.js';

export class BusinessException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        success: false,
        error: {
          code: errorCode,
          message,
          statusCode,
        },
      },
      statusCode,
    );
    this.errorCode = errorCode;
  }
}
