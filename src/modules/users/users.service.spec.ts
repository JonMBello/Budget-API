import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, Currency } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  const mockUserInstance: any = {
    _id: '654321654321654321654321',
    email: 'test@example.com',
    name: 'Test User',
    currency: Currency.MXN,
    isActive: true,
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockUserModel = jest.fn().mockImplementation(() => mockUserInstance);
    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();
    mockUserModel.findByIdAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new user if email does not exist', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockUserInstance.save.mockResolvedValue(mockUserInstance);

      const result = await service.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      });

      expect(result).toEqual(mockUserInstance);
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserInstance),
      });

      await expect(
        service.create({
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return user if found and active', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserInstance),
      });

      const result = await service.findById('654321654321654321654321');
      expect(result).toEqual(mockUserInstance);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('non_existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user fields successfully', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUserInstance,
          name: 'Updated Name',
        }),
      });

      const result = await service.update('654321654321654321654321', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if user to update is not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('non_existent', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
