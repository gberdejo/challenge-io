import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardProcessorController } from './card-processor.controller';
import { CardProcessorService } from './card-processor.service';
import { KAFKA_SERVICE } from './constants/kafka.constants';
import { CardRequest, CardRequestTracking, Card } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([CardRequest, CardRequestTracking, Card]),
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId:
                configService.get<string>('KAFKA_CLIENT_ID') ||
                'card-processor-producer',
              brokers: configService
                .get<string>('KAFKA_BROKERS')
                ?.split(',') || ['localhost:9092'],
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [CardProcessorController],
  providers: [CardProcessorService],
})
export class CardProcessorModule {}
