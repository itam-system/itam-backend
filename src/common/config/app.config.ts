import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: 'Asia/Phnom_Penh',
  apiPrefix: 'api/v1',
}));
