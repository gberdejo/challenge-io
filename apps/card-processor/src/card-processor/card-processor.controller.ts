import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  KafkaContext,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { CardProcessorService } from './card-processor.service';
import { CardRequestDto } from './dto/card-request.dto';
import { KAFKA_TOPICS } from './constants/kafka.constants';

@Controller()
export class CardProcessorController {
  private readonly logger = new Logger(CardProcessorController.name);

  constructor(private readonly cardProcessorService: CardProcessorService) {}

  @MessagePattern(KAFKA_TOPICS.CARD_REQUESTED)
  async handleCardRequest(
    @Payload() message: CardRequestDto,
    @Ctx() context: KafkaContext,
  ) {
    const originalMessage = context.getMessage();
    const topic = context.getTopic();
    const headers = originalMessage.headers || {};
    const retryCount = parseInt(headers['retry-count']?.toString() || '0', 10);

    this.logger.log(`[${topic}] Received message: retryCount=${retryCount}`);

    try {
      await this.cardProcessorService.processCardRequest(message, context);
      this.logger.log('[SUCCESS] Message processed and acknowledged');
    } catch (error) {
      this.logger.error('[ERROR] Error processing message:', error);
      // No relanzar el error para confirmar el mensaje
      // El servicio ya se encarga de reenviar o mover a DLQ
    }
  }

  @MessagePattern(KAFKA_TOPICS.CARD_REQUESTED_DLQ)
  handleDLQMessage(
    @Payload() message: CardRequestDto,
    @Ctx() context: KafkaContext,
  ) {
    const originalMessage = context.getMessage();
    const topic = context.getTopic();
    const headers = originalMessage.headers || {};

    this.logger.log(`[${topic}] DLQ Message received`);
    this.logger.warn('Message in DLQ:', {
      customer: message.customer.fullName,
      product: message.product.type,
      retryCount: headers['retry-count']?.toString(),
      reason: headers['reason']?.toString(),
    });
  }

  @MessagePattern(KAFKA_TOPICS.CARD_PROCESSED)
  async handleCardProcessed(
    @Payload() message: CardRequestDto,
    @Ctx() context: KafkaContext,
  ) {
    const topic = context.getTopic();

    this.logger.log(`[${topic}] Card processed message received`);

    try {
      await this.cardProcessorService.createCreditCard(message, context);
      this.logger.log('[SUCCESS] Credit card created successfully');
    } catch (error) {
      this.logger.error('[ERROR] Error creating credit card:', error);
    }
  }
}
