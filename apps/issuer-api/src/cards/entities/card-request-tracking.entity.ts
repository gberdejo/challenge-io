import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CardRequest } from './card-request.entity';

@Entity('card_request_tracking')
export class CardRequestTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CardRequest)
  @JoinColumn({ name: 'card_request_id' })
  cardRequest: CardRequest;

  @Column({ name: 'card_request_id', type: 'uuid' })
  cardRequestId: string;

  @Column({
    length: 50,
    comment: 'Status: pending, processing, retry, success, failed, sent_to_dlq',
  })
  status: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'simulate_error', default: false })
  simulateError: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'kafka_topic', length: 100, nullable: true })
  kafkaTopic: string;

  @Column({ name: 'kafka_partition', type: 'int', nullable: true })
  kafkaPartition: number;

  @Column({ name: 'kafka_offset', type: 'bigint', nullable: true })
  kafkaOffset: string;

  @Column({ name: 'processed_by', length: 100, nullable: true })
  processedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
