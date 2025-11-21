import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // Crear microservicio puro (sin HTTP)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId:
            process.env.KAFKA_CLIENT_ID || 'challenge-io-card-processor',
          brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID || 'card-processor-group',
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
          allowAutoTopicCreation: false,
        },
      },
    },
  );

  await app.listen();
  console.log('Card Processor microservice started');
  console.log('Kafka consumer connected');
}
void bootstrap();
