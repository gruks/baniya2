import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('workflows')
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'jsonb', default: '{"nodes":[],"edges":[]}' })
  definition!: { nodes: unknown[]; edges: unknown[] };

  @Column({ type: 'boolean', default: false })
  active!: boolean;

  @Column({ type: 'uuid', nullable: true })
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
