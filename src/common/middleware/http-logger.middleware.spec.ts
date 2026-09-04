import { HttpLoggerMiddleware } from './http-logger.middleware';

describe('HttpLoggerMiddleware', () => {
  let middleware: HttpLoggerMiddleware;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let finishCallback: () => void;

  beforeEach(() => {
    middleware = new HttpLoggerMiddleware();

    mockRequest = {
      method: 'GET',
      originalUrl: '/api/users/me',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('PostmanRuntime/7.36.0'),
    };

    mockResponse = {
      statusCode: 200,
      locals: {},
      on: jest.fn().mockImplementation((event: string, cb: () => void) => {
        if (event === 'finish') {
          finishCallback = cb;
        }
      }),
    };

    mockNext = jest.fn();
  });

  it('should log incoming request and call next()', () => {
    const logSpy = jest.spyOn((middleware as any).logger, 'log').mockImplementation();

    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('📥 --> [GET] /api/users/me');
  });

  it('should log successful outgoing response on finish', () => {
    const logSpy = jest.spyOn((middleware as any).logger, 'log').mockImplementation();

    middleware.use(mockRequest, mockResponse, mockNext);

    // Simulate response finish
    mockResponse.statusCode = 200;
    finishCallback();

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy.mock.calls[1][0]).toContain('📤 <-- [GET] /api/users/me 200');
    expect(logSpy.mock.calls[1][0]).toMatch(/\+\d+ms/);
  });

  it('should log warning when request fails with 401 Unauthorized', () => {
    const logSpy = jest.spyOn((middleware as any).logger, 'log').mockImplementation();
    const warnSpy = jest.spyOn((middleware as any).logger, 'warn').mockImplementation();

    middleware.use(mockRequest, mockResponse, mockNext);

    // Simulate 401 error response from Guard / ExceptionFilter
    mockResponse.statusCode = 401;
    mockResponse.locals.errorMessage = 'Unauthorized';
    finishCallback();

    expect(logSpy).toHaveBeenCalledTimes(1); // Incoming
    expect(warnSpy).toHaveBeenCalledTimes(1); // Outgoing error
    expect(warnSpy.mock.calls[0][0]).toContain('❌ <-- [GET] /api/users/me 401');
    expect(warnSpy.mock.calls[0][0]).toContain('Unauthorized');
  });
});
