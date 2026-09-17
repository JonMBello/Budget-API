import { Test, TestingModule } from '@nestjs/testing';
import { PeopleV2Controller } from './people-v2.controller';
import { PeopleService } from './people.service';

describe('PeopleV2Controller', () => {
  let controller: PeopleV2Controller;
  let service: PeopleService;

  const mockUserId = '654321654321654321654321';
  const mockPersonId = '111111111111111111111111';

  const mockPeopleService = {
    getDebtsSummaryV2: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeopleV2Controller],
      providers: [
        {
          provide: PeopleService,
          useValue: mockPeopleService,
        },
      ],
    }).compile();

    controller = module.get<PeopleV2Controller>(PeopleV2Controller);
    service = module.get<PeopleService>(PeopleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDebtsSummaryV2', () => {
    it('should call peopleService.getDebtsSummaryV2 and return the result', async () => {
      const mockResult = {
        personId: mockPersonId,
        name: 'Juan Pérez',
        phoneCode: '+52',
        phone: '8181234567',
        email: 'juan.perez@example.com',
        totalDebt: 2500,
        periods: [
          {
            period: '2026-09',
            year: 2026,
            month: 9,
            periodName: 'Septiembre 2026',
            periodId: '555555555555555555555555',
            totalDebt: 1500,
            msiInstallments: [],
            recurringServices: [],
            singleExpenses: [],
          },
        ],
      };

      mockPeopleService.getDebtsSummaryV2.mockResolvedValue(mockResult);

      const result = await controller.getDebtsSummaryV2(mockUserId, mockPersonId);

      expect(result).toEqual(mockResult);
      expect(service.getDebtsSummaryV2).toHaveBeenCalledWith(mockUserId, mockPersonId);
    });
  });
});
