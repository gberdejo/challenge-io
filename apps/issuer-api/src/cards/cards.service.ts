import {
  Inject,
  Injectable,
  OnModuleInit,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { IssueCardDto } from './dto/issue-card.dto';
import { CardRequest, CardRequestTracking, Card } from './entities';
import {
  KAFKA_SERVICE,
  KAFKA_TOPICS,
  TRACKING_STATUS,
  PROCESSED_BY,
  INITIAL_RETRY_COUNT,
  RESPONSE_MESSAGES,
} from './constants/kafka.constants';

@Injectable()
export class CardsService implements OnModuleInit {
  constructor(
    @InjectRepository(CardRequest)
    private cardRequestRepository: Repository<CardRequest>,
    @InjectRepository(CardRequestTracking)
    private trackingRepository: Repository<CardRequestTracking>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Conectar el producer al iniciar
    await this.kafkaClient.connect();
  }

  async issueCard(issueCardDto: IssueCardDto) {
    // 1. Buscar o crear el CardRequest
    let cardRequest = await this.cardRequestRepository.findOne({
      where: { documentNumber: issueCardDto.customer.documentNumber },
    });

    if (!cardRequest) {
      cardRequest = this.cardRequestRepository.create({
        documentType: issueCardDto.customer.documentType,
        documentNumber: issueCardDto.customer.documentNumber,
        fullName: issueCardDto.customer.fullName,
        age: issueCardDto.customer.age,
        email: issueCardDto.customer.email,
        productType: issueCardDto.product.type,
        currency: issueCardDto.product.currency,
      });
      await this.cardRequestRepository.save(cardRequest);
    } else {
      // Validar si el cliente ya tiene una tarjeta activa del tipo solicitado
      const existingCard = await this.cardRepository.findOne({
        where: {
          cardRequestId: cardRequest.id,
          cardType: issueCardDto.product.type,
          status: 'active',
        },
      });

      if (existingCard) {
        const maskedCardNumber = `**** **** **** ${existingCard.cardNumber.slice(-4)}`;
        throw new ConflictException(
          `El cliente con documento ${issueCardDto.customer.documentNumber} ya tiene una tarjeta de ${issueCardDto.product.type} activa (${maskedCardNumber})`,
        );
      }

      // Actualizar datos si ya existe
      cardRequest.fullName = issueCardDto.customer.fullName;
      cardRequest.age = issueCardDto.customer.age;
      cardRequest.email = issueCardDto.customer.email;
      cardRequest.productType = issueCardDto.product.type;
      cardRequest.currency = issueCardDto.product.currency;
      await this.cardRequestRepository.save(cardRequest);
    }

    // 2. Crear registro de tracking
    const tracking = this.trackingRepository.create({
      cardRequestId: cardRequest.id,
      status: TRACKING_STATUS.PENDING,
      retryCount: INITIAL_RETRY_COUNT,
      simulateError: issueCardDto.product.simulateError,
      kafkaTopic: KAFKA_TOPICS.CARD_REQUESTED,
      processedBy: PROCESSED_BY.ISSUER_API,
    });
    await this.trackingRepository.save(tracking);

    // 3. Enviar mensaje a Kafka
    this.kafkaClient.emit(KAFKA_TOPICS.CARD_REQUESTED, {
      value: JSON.stringify(issueCardDto),
      headers: {
        'card-request-id': cardRequest.id,
        'retry-count': INITIAL_RETRY_COUNT.toString(),
      },
    });

    return {
      message: RESPONSE_MESSAGES.CARD_ISSUANCE_RECEIVED,
      cardRequestId: cardRequest.id,
    };
  }
}
