import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

@Injectable()
export class MongoIdValidationPipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!OBJECT_ID_REGEX.test(value)) {
      throw new BadRequestException(
        `${metadata.data || 'id'} must be a valid MongoDB ObjectId`,
      );
    }
    return value;
  }
}
