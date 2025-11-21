import { Test, TestingModule } from '@nestjs/testing';
import { CardProcessorService } from './card-processor.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KafkaContext } from '@nestjs/microservices';
import { CardRequest, CardRequestTracking, Card } from '../entities';
import { KAFKA_SERVICE } from './constants/kafka.constants';
import { CardRequestDto } from './dto/card-request.dto';

describe('CardProcessorService - processCardRequest', () => {
  let service: CardProcessorService;

  // Mock data
  const mockCardRequestDto: CardRequestDto = {
    customer: {
      documentType: 'DNI',
      documentNumber: '12345678',
      fullName: 'Juan Pérez',
      age: 30,
      email: 'juan@example.com',
    },
    product: {
      type: 'credit',
      currency: 'PEN',
      simulateError: false,
    },
  };

  const mockCardRequestId = 'test-card-request-id-123';

  // Mock repositories
  const mockCardRequestRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTrackingRepository = {
    create: jest
      .fn()
      .mockImplementation((tracking: CardRequestTracking) => tracking),
    save: jest
      .fn()
      .mockImplementation((tracking: CardRequestTracking) =>
        Promise.resolve(tracking),
      ),
  };

  const mockCardRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  // Mock Kafka client
  const mockKafkaClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn().mockReturnValue(undefined),
  };

  // Mock Kafka context
  const createMockContext = (
    retryCount: number = 0,
    cardRequestId: string = mockCardRequestId,
  ): KafkaContext => {
    return {
      getMessage: jest.fn().mockReturnValue({
        headers: {
          'retry-count': retryCount.toString(),
          'card-request-id': cardRequestId,
        },
      }),
      getPartition: jest.fn(),
      getTopic: jest.fn(),
      getConsumer: jest.fn(),
      getHeartbeat: jest.fn(),
      getProducer: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
    } as unknown as KafkaContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardProcessorService,
        {
          provide: getRepositoryToken(CardRequest),
          useValue: mockCardRequestRepository,
        },
        {
          provide: getRepositoryToken(CardRequestTracking),
          useValue: mockTrackingRepository,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: mockCardRepository,
        },
        {
          provide: KAFKA_SERVICE,
          useValue: mockKafkaClient,
        },
      ],
    }).compile();

    service = module.get<CardProcessorService>(CardProcessorService);

    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processCardRequest - Caso exitoso sin errores', () => {
    it('debe procesar una solicitud exitosamente cuando simulateError es false', async () => {
      const context = createMockContext(0);
      const data = {
        ...mockCardRequestDto,
        product: { ...mockCardRequestDto.product, simulateError: false },
      };

      await service.processCardRequest(data, context);

      // Verificar que se creó tracking de PROCESSING
      expect(mockTrackingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cardRequestId: mockCardRequestId,
          status: 'processing',
          retryCount: 0,
        }),
      );

      // Verificar que se creó tracking de SUCCESS
      expect(mockTrackingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cardRequestId: mockCardRequestId,
          status: 'success',
          retryCount: 0,
        }),
      );

      // Verificar que se guardó el tracking
      expect(mockTrackingRepository.save).toHaveBeenCalledTimes(2);

      // Verificar que se emitió mensaje al topic de procesamiento exitoso
      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        'io.card.processed.v1',
        expect.objectContaining({
          value: expect.any(String),
          headers: expect.objectContaining({
            'card-request-id': mockCardRequestId,
          }),
        }),
      );
    });
  });
});
