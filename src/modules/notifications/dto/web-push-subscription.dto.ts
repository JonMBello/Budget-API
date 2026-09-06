import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

export class WebPushKeysDto {
  @ApiProperty({
    example: 'BCP4...xyz',
    description: 'P256DH public key from the PushSubscription',
  })
  @IsString({ message: 'p256dh must be a string' })
  @IsNotEmpty({ message: 'p256dh key is required' })
  p256dh: string;

  @ApiProperty({
    example: 'authKey123...',
    description: 'Authentication secret from the PushSubscription',
  })
  @IsString({ message: 'auth must be a string' })
  @IsNotEmpty({ message: 'auth key is required' })
  auth: string;
}

export class WebPushSubscribeDto {
  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/c_123456...',
    description: 'Push service endpoint URL provided by browser PushManager',
  })
  @IsUrl({}, { message: 'endpoint must be a valid URL' })
  @IsNotEmpty({ message: 'endpoint is required' })
  endpoint: string;

  @ApiProperty({ type: WebPushKeysDto })
  @IsObject()
  @ValidateNested()
  @Type(() => WebPushKeysDto)
  keys: WebPushKeysDto;

  @ApiPropertyOptional({
    example: 'iPhone 15 Safari PWA',
    description: 'Optional device or browser description',
  })
  @IsOptional()
  @IsString({ message: 'device must be a string' })
  device?: string;
}

export class WebPushUnsubscribeDto {
  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/c_123456...',
    description: 'Push service endpoint URL to unsubscribe',
  })
  @IsUrl({}, { message: 'endpoint must be a valid URL' })
  @IsNotEmpty({ message: 'endpoint is required' })
  endpoint: string;
}

export class VapidPublicKeyResponseDto {
  @ApiProperty({
    example: 'BCP4...xyz',
    description: 'VAPID Public Key for client applicationServerKey initialization',
  })
  publicKey: string;
}
