import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('valid_secret_api_key'),
    };
    guard = new ApiKeyGuard(configService as ConfigService);
  });

  const createMockContext = (headers: Record<string, string>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as any;

  it('should allow request when valid x-api-key header is provided', () => {
    const context = createMockContext({ 'x-api-key': 'valid_secret_api_key' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException with message "Unauthorized request" when x-api-key header is missing', () => {
    const context = createMockContext({});
    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Unauthorized request'),
    );
  });

  it('should throw UnauthorizedException with message "Unauthorized request" when x-api-key header is invalid', () => {
    const context = createMockContext({ 'x-api-key': 'wrong_api_key' });
    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Unauthorized request'),
    );
  });
});
