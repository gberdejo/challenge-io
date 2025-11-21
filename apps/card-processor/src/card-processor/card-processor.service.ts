import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka, KafkaContext } from '@nestjs/microservices';
import { CardRequestDto } from './dto/card-request.dto';
import {
  KAFKA_SERVICE,
  KAFKA_TOPICS,
  RETRY_CONFIG,
} from './constants/kafka.constants';
import { TRACKING_STATUS, PROCESSED_BY } from './constants/tracking.constants';
import { CardRequest, CardRequestTracking, Card } from '../entities';

@Injectable()
export class CardProcessorService implements OnModuleInit {
  private readonly logger = new Logger(CardProcessorService.name);
  private readonly MAX_RETRIES = RETRY_CONFIG.MAX_RETRIES;
  private readonly RETRY_DELAYS = RETRY_CONFIG.DELAYS;
  private readonly CARD_REQUESTED_TOPIC = KAFKA_TOPICS.CARD_REQUESTED;
  private readonly DLQ_TOPIC = KAFKA_TOPICS.CARD_REQUESTED_DLQ;

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

  async processCardRequest(
    data: CardRequestDto,
    context: KafkaContext,
  ): Promise<void> {
    const headers = context.getMessage().headers || {};
    const retryCount = parseInt(headers['retry-count']?.toString() || '0', 10);
    const cardRequestId = headers['card-request-id']?.toString();

    // Validar que existe cardRequestId
    if (!cardRequestId) {
      this.logger.error('Missing card-request-id header, sending to DLQ');
      this.sendToDLQ(data, retryCount, headers);
      return;
    }

    this.logger.log(
      `Processing card request (attempt ${retryCount + 1}/${this.MAX_RETRIES + 1})`,
    );
    this.logger.log(`Customer: ${data.customer.fullName}`);
    this.logger.log(
      `Product: ${data.product.type}, simulateError: ${data.product.simulateError}`,
    );

    // Crear tracking de processing
    await this.createTracking(
      cardRequestId,
      TRACKING_STATUS.PROCESSING,
      retryCount,
      data.product.simulateError,
    );

    // Verificar si se debe simular un error
    if (data.product.simulateError) {
      this.logger.warn('simulateError=true detected, will requeue message');

      // Verificar si aún hay reintentos disponibles
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[retryCount];
        const nextRetryTime = Date.now() + delay;

        this.logger.log(
          `Requeuing message with retry ${retryCount + 1}/${this.MAX_RETRIES}, delay: ${delay}ms`,
        );

        // Crear tracking de retry
        await this.createTracking(
          cardRequestId,
          TRACKING_STATUS.RETRY,
          retryCount + 1,
          data.product.simulateError,
        );

        // Reenviar el mensaje al mismo topic con el retryCount incrementado
        await this.requeueMessage(data, retryCount + 1, nextRetryTime, headers);

        return;
      } else {
        // Se agotaron los reintentos, enviar a DLQ
        this.logger.error(
          `Max retries (${this.MAX_RETRIES}) reached. Sending to DLQ`,
        );

        // Crear tracking de DLQ
        await this.createTracking(
          cardRequestId,
          TRACKING_STATUS.SENT_TO_DLQ,
          retryCount,
          data.product.simulateError,
          'Max retries exceeded',
        );

        this.sendToDLQ(data, retryCount, headers);

        return;
      }
    }

    // Si simulateError es false, procesar normalmente
    this.logger.log('Processing card request successfully');
    this.processSuccessfulRequest(data, headers);

    // Crear tracking de success
    await this.createTracking(
      cardRequestId,
      TRACKING_STATUS.SUCCESS,
      retryCount,
      data.product.simulateError,
    );
  }

  private async requeueMessage(
    data: CardRequestDto,
    retryCount: number,
    nextRetryTime: number,
    headers: any,
  ): Promise<void> {
    try {
      const delay = this.RETRY_DELAYS[retryCount - 1];

      this.logger.log(
        `Waiting ${delay}ms before requeuing message with retry-count: ${retryCount}`,
      );

      // Esperar el delay antes de enviar el mensaje
      await new Promise((resolve) => setTimeout(resolve, delay));

      this.kafkaClient.emit(this.CARD_REQUESTED_TOPIC, {
        value: JSON.stringify(data),
        headers: {
          'retry-count': retryCount.toString(),
          'next-retry-time': nextRetryTime.toString(),
          'original-timestamp': Date.now().toString(),
          'card-request-id': headers['card-request-id']?.toString(),
        },
      });

      this.logger.log(
        `Message requeued to ${this.CARD_REQUESTED_TOPIC} with retry-count: ${retryCount}`,
      );
    } catch (error) {
      this.logger.error('Error requeuing message:', error);
      throw error;
    }
  }

  private sendToDLQ(
    data: CardRequestDto,
    retryCount: number,
    headers: any,
  ): void {
    try {
      this.kafkaClient.emit(this.DLQ_TOPIC, {
        value: JSON.stringify(data),
        headers: {
          'retry-count': retryCount.toString(),
          'failed-timestamp': Date.now().toString(),
          reason: 'Max retries exceeded',
          'card-request-id': headers['card-request-id']?.toString(),
        },
      });

      this.logger.log(`Message sent to DLQ: ${this.DLQ_TOPIC}`);
    } catch (error) {
      this.logger.error('Error sending message to DLQ:', error);
      throw error;
    }
  }

  private async createTracking(
    cardRequestId: string,
    status: string,
    retryCount: number,
    simulateError: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const tracking = this.trackingRepository.create({
        cardRequestId,
        status,
        retryCount,
        simulateError,
        errorMessage,
        kafkaTopic:
          status === TRACKING_STATUS.SENT_TO_DLQ
            ? this.DLQ_TOPIC
            : status === TRACKING_STATUS.CARD_CREATED
              ? KAFKA_TOPICS.CARD_PROCESSED
              : this.CARD_REQUESTED_TOPIC,
        processedBy: PROCESSED_BY.CARD_PROCESSOR,
      });

      await this.trackingRepository.save(tracking);
      this.logger.log(
        `Tracking created: cardRequestId=${cardRequestId}, status=${status}, retryCount=${retryCount}`,
      );
    } catch (error) {
      this.logger.error(`Error creating tracking: ${error.message}`);
    }
  }

  private processSuccessfulRequest(data: CardRequestDto, headers: any): void {
    this.logger.log('Card processed successfully');
    this.logger.log(`Customer: ${data.customer.fullName}`);
    this.logger.log(
      `Product: ${data.product.type}, Currency: ${data.product.currency}`,
    );

    const cardRequestId = headers['card-request-id']?.toString();

    // Enviar a la cola de procesamiento exitoso
    this.kafkaClient.emit(KAFKA_TOPICS.CARD_PROCESSED, {
      value: JSON.stringify({
        ...data,
        processedAt: new Date().toISOString(),
        status: 'success',
      }),
      headers: {
        'processed-timestamp': Date.now().toString(),
        'card-request-id': cardRequestId,
      },
    });

    this.logger.log(
      `Message sent to success queue: ${KAFKA_TOPICS.CARD_PROCESSED}`,
    );
  }

  async createCreditCard(
    data: CardRequestDto,
    context: KafkaContext,
  ): Promise<void> {
    const headers = context.getMessage().headers || {};
    const cardRequestId = headers['card-request-id']?.toString();

    if (!cardRequestId) {
      this.logger.error('Missing card-request-id header, cannot create card');
      return;
    }

    this.logger.log(`Creating credit card for cardRequestId: ${cardRequestId}`);

    try {
      // Buscar el CardRequest
      const cardRequest = await this.cardRequestRepository.findOne({
        where: { id: cardRequestId },
      });

      if (!cardRequest) {
        this.logger.error(`CardRequest not found: ${cardRequestId}`);
        return;
      }

      // Crear tracking de creación de tarjeta
      await this.createTracking(
        cardRequestId,
        TRACKING_STATUS.CARD_CREATED,
        0,
        false,
        undefined,
      );

      // Generar número de tarjeta (16 dígitos aleatorios)
      const cardNumber = this.generateCardNumber();
      const cvv = this.generateCVV();
      const expiryDate = this.generateExpiryDate();

      // Crear la tarjeta
      const card = this.cardRepository.create({
        cardRequestId: cardRequest.id,
        cardNumber,
        cvv,
        expiryDate,
        cardHolderName: cardRequest.fullName,
        cardType: cardRequest.productType,
        currency: cardRequest.currency,
        creditLimit: data.product.type === 'credit' ? 5000 : undefined,
        status: 'active',
      });

      await this.cardRepository.save(card);

      this.logger.log(
        `Credit card created successfully: ****${cardNumber.slice(-4)} for ${cardRequest.fullName}`,
      );
    } catch (error) {
      this.logger.error(`Error creating credit card: ${error.message}`);
      throw error;
    }
  }

  private generateCardNumber(): string {
    // Generar 16 dígitos aleatorios
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 10),
    ).join('');
  }

  private generateCVV(): string {
    // Generar 3 dígitos aleatorios
    return Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join(
      '',
    );
  }

  private generateExpiryDate(): string {
    // Generar fecha de expiración: 5 años desde ahora en formato MM/YYYY
    const now = new Date();
    const expiryYear = now.getFullYear() + 5;
    const expiryMonth = String(now.getMonth() + 1).padStart(2, '0');
    return `${expiryMonth}/${expiryYear}`;
  }
}
