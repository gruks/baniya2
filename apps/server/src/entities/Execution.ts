import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('executions')
export class ExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workflowId!: string;

  @Column({ type: 'varchar', default: 'running' })
  status!: string;

  @Column({ type: 'jsonb', default: '[]' })
  nodeResults!: unknown[];

  @Column({ type: 'float', default: 0 })
  totalCostUsd!: number;

  @Column({ type: 'int', default: 0 })
  totalLatencyMs!: number;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;
}
