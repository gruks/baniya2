import { AppDataSource } from './src/data-source';
import { ExecutionEntity } from './src/entities/Execution';

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(ExecutionEntity);
  const executions = await repo.find({ 
    where: { workflowId: 'b0bbbc78-a259-4f96-82be-168533cf2bc4' },
    order: { startedAt: 'DESC' },
    take: 1
  });
  console.log(JSON.stringify(executions, null, 2));
  process.exit(0);
}

main().catch(console.error);
