import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('card_requests')
export class CardRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_type', length: 50 })
  documentType: string;

  @Column({ name: 'document_number', length: 100, unique: true })
  documentNumber: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ type: 'int' })
  age: number;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'product_type', length: 50 })
  productType: string;

  @Column({ length: 10 })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
