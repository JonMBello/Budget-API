import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Partial<Reflector>>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new JwtAuthGuard(reflector as Reflector);
  });

  const createMockContext = () =>
    ({
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(class MockClass {}),
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    }) as unknown as ExecutionContext;

  it('should return true for public routes without validating JWT', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  it('should throw UnauthorizedException with message "Unauthorized request" when handleRequest has err', () => {
    expect(() => guard.handleRequest(new Error('jwt expired'), null)).toThrow(
      new UnauthorizedException('Unauthorized request'),
    );
  });

  it('should throw UnauthorizedException with message "Unauthorized request" when user is null', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(
      new UnauthorizedException('Unauthorized request'),
    );
  });

  it('should return user when user is valid and no error exists', () => {
    const mockUser = { userId: '123', email: 'test@example.com' };
    expect(guard.handleRequest(null, mockUser)).toEqual(mockUser);
  });
});
