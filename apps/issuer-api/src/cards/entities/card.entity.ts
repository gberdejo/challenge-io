import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CardRequest } from './card-request.entity';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_request_id' })
  cardRequestId: string;

  @ManyToOne(() => CardRequest)
  @JoinColumn({ name: 'card_request_id' })
  cardRequest: CardRequest;

  @Column({ name: 'card_number', length: 16, unique: true })
  cardNumber: string;

  @Column({ name: 'cvv', length: 3 })
  cvv: string;

  @Column({ name: 'expiry_date', length: 7 })
  expiryDate: string; // Formato: MM/YYYY

  @Column({ name: 'card_holder_name', length: 100 })
  cardHolderName: string;

  @Column({ name: 'card_type', length: 50 })
  cardType: string; // credit, debit

  @Column({ length: 10 })
  currency: string;

  @Column({
    name: 'credit_limit',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  creditLimit: number;

  @Column({ name: 'status', length: 20, default: 'active' })
  status: string; // active, blocked, expired

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
