import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const isRegistrationAllowed = this.configService.get<boolean>(
      'BUDGET_API_ALLOW_REGISTRATION',
      false,
    );

    if (!isRegistrationAllowed) {
      throw new ForbiddenException('Registration is currently disabled');
    }

    const validInviteCode = this.configService.get<string>('BUDGET_API_REGISTRATION_INVITE_CODE');

    if (registerDto.inviteCode !== validInviteCode) {
      throw new ForbiddenException('Invalid invite code');
    }

    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const newUser = await this.usersService.create({
      email: registerDto.email,
      passwordHash,
      name: registerDto.name,
      currency: registerDto.currency,
    });

    const tokens = await this.generateTokens(newUser._id.toString(), newUser.email);

    await this.updateRefreshTokenHash(newUser._id.toString(), tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name,
        currency: newUser.currency,
        createdAt: newUser.createdAt,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email);

    await this.updateRefreshTokenHash(user._id.toString(), tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        currency: user.currency,
        createdAt: user.createdAt,
      },
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const refreshSecret = this.configService.get<string>('BUDGET_API_JWT_REFRESH_SECRET');

    let payload: { sub: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Unauthorized request');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Unauthorized request');
    }

    const isRefreshTokenMatch = await bcrypt.compare(
      refreshTokenDto.refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenMatch) {
      throw new UnauthorizedException('Unauthorized request');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email);

    await this.updateRefreshTokenHash(user._id.toString(), tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        currency: user.currency,
        createdAt: user.createdAt,
      },
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('BUDGET_API_JWT_SECRET'),
        expiresIn: this.configService.get<string>('BUDGET_API_JWT_EXPIRES_IN', '1h'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('BUDGET_API_JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('BUDGET_API_JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshTokenHash(userId, hash);
  }
}
