import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardProcessorModule } from './card-processor/card-processor.module';
import { CardRequest, CardRequestTracking, Card } from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'admin',
      password: process.env.POSTGRES_PASSWORD || 'admin123',
      database: process.env.POSTGRES_DATABASE || 'challenge_io',
      entities: [CardRequest, CardRequestTracking, Card],
      synchronize: true,
      logging: true,
    }),
    CardProcessorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
