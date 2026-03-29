import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('baniya_audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workflowId!: string;

  @Column({ type: 'uuid' })
  executionId!: string;

  @Column({ type: 'varchar' })
  nodeId!: string;

  @Column({ type: 'varchar' })
  sensitivityLevel!: string;

  @Column({ type: 'simple-array' })
  detectedPatterns!: string[];

  @Column({ type: 'varchar' })
  routingDecision!: string;

  @Column({ type: 'varchar' })
  modelUsed!: string;

  @Column({ type: 'float', default: 0 })
  costUSD!: number;

  @Column({ type: 'int', default: 0 })
  latencyMs!: number;

  @Column({ type: 'int', default: 0 })
  tokensIn!: number;

  @Column({ type: 'int', default: 0 })
  tokensOut!: number;

  @Column({ type: 'boolean', default: false })
  sanitizerApplied!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
