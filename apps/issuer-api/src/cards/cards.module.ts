import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardRequest, CardRequestTracking, Card } from './entities';
import { KAFKA_SERVICE } from './constants/kafka.constants';

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
                'challenge-io-issuer',
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
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}
