import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  openaiApiKey!: string | null;

  @Column({ type: 'varchar', nullable: true })
  anthropicApiKey!: string | null;

  @Column({ type: 'varchar', nullable: true })
  googleApiKey!: string | null;

  @Column({ type: 'varchar', default: 'http://localhost:11434' })
  ollamaUrl!: string;

  @Column({ type: 'boolean', default: true })
  ollamaEnabled!: boolean;

  @Column({ type: 'varchar', default: 'llama3.2' })
  defaultLocalModel!: string;

  @Column({ type: 'varchar', default: 'gemini-2.0-flash' })
  defaultCloudModel!: string;

  @Column({ type: 'varchar', default: 'auto' })
  defaultRoute!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
