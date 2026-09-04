import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Currency } from '../users/schemas/user.schema';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: any;
  let jwtService: any;
  let configService: any;

  const mockUser: any = {
    _id: '654321654321654321654321',
    email: 'test@example.com',
    passwordHash: 'hashed_password_123',
    name: 'Test User',
    currency: Currency.MXN,
    isActive: true,
    refreshTokenHash: 'hashed_refresh_token',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateRefreshTokenHash: jest.fn(),
    };

    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('mock_access_token')
        .mockResolvedValueOnce('mock_refresh_token'),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        switch (key) {
          case 'BUDGET_API_REGISTRATION_INVITE_CODE':
            return 'BUDGET_VIP_2026';
          case 'BUDGET_API_JWT_SECRET':
            return 'jwt_secret';
          case 'BUDGET_API_JWT_EXPIRES_IN':
            return '1h';
          case 'BUDGET_API_JWT_REFRESH_SECRET':
            return 'jwt_refresh_secret';
          case 'BUDGET_API_JWT_REFRESH_EXPIRES_IN':
            return '7d';
          default:
            return defaultValue;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully when invite code is valid', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_value');

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        inviteCode: 'BUDGET_VIP_2026',
        currency: Currency.MXN,
      });

      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(result.user.email).toBe('test@example.com');
      expect(usersService.create).toHaveBeenCalled();
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if invite code does not match', async () => {
      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
          inviteCode: 'WRONG_CODE',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
          inviteCode: 'BUDGET_VIP_2026',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(result.user.name).toBe('Test User');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'notfound@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens when refresh token is valid and matches DB hash', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: mockUser._id,
        email: mockUser.email,
      });
      usersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.refreshTokens({
        refreshToken: 'valid_refresh_token',
      });

      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        authService.refreshTokens({
          refreshToken: 'expired_token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token does not match DB hash', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: mockUser._id,
        email: mockUser.email,
      });
      usersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.refreshTokens({
          refreshToken: 'revoked_token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
