import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { UserEntity } from './entities/User';
import { WorkflowEntity } from './entities/Workflow';
import { ExecutionEntity } from './entities/Execution';
import { AuditLog } from '@baniya/audit-logger';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://baniya:baniya@localhost:5432/baniya',
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  synchronize: true, // auto-sync in dev
  logging: false,
  entities: [UserEntity, WorkflowEntity, ExecutionEntity, AuditLog],
});
