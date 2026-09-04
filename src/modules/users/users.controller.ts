import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserProfileResponseDto } from '../auth/dto/auth-response.dto';

@ApiTags('Users')
@Auth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
    type: UserProfileResponseDto,
  })
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      currency: user.currency,
      createdAt: user.createdAt,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: UserProfileResponseDto,
  })
  async updateProfile(@CurrentUser('userId') userId: string, @Body() updateUserDto: UpdateUserDto) {
    const updated = await this.usersService.update(userId, updateUserDto);
    return {
      id: updated._id.toString(),
      email: updated.email,
      name: updated.name,
      currency: updated.currency,
      createdAt: updated.createdAt,
    };
  }
}
