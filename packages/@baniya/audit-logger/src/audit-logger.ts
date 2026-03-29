import { Repository, DataSource, MoreThanOrEqual } from 'typeorm';
import type { AuditRow, CostSummary, RoutingTarget } from '@baniya/types';
import { AuditLog } from './entities/AuditLog';

let cachedInrRate: { rate: number; fetchedAt: number } | null = null;
const INR_CACHE_TTL = 3600_000; // 1 hour

async function getInrRate(): Promise<number> {
  if (cachedInrRate && Date.now() - cachedInrRate.fetchedAt < INR_CACHE_TTL) {
    return cachedInrRate.rate;
  }
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { rates: Record<string, number> };
    const rate = data.rates?.INR ?? 83;
    cachedInrRate = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return cachedInrRate?.rate ?? 83;
  }
}

export class AuditLogger {
  private repo: Repository<AuditLog>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(AuditLog);
  }

  async write(entry: Omit<AuditRow, 'id' | 'createdAt'>): Promise<void> {
    const log = this.repo.create({
      workflowId: entry.workflowId,
      executionId: entry.executionId,
      nodeId: entry.nodeId,
      sensitivityLevel: entry.sensitivityLevel,
      detectedPatterns: entry.detectedPatterns,
      routingDecision: entry.routingDecision,
      modelUsed: entry.modelUsed,
      costUSD: entry.costUSD,
      latencyMs: entry.latencyMs,
      tokensIn: entry.tokensIn,
      tokensOut: entry.tokensOut,
      sanitizerApplied: entry.sanitizerApplied,
    });
    await this.repo.save(log);
  }

  async getCostSummary(workflowId?: string, days: number = 30): Promise<CostSummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const qb = this.repo.createQueryBuilder('log')
      .where('log.createdAt >= :since', { since });

    if (workflowId) {
      qb.andWhere('log.workflowId = :workflowId', { workflowId });
    }

    const rows = await qb.getMany();

    let totalCostUSD = 0;
    let totalHypotheticalCost = 0;
    const byModel: Record<string, number> = {};
    const byRoute: Record<string, number> = { local: 0, hybrid: 0, cloud: 0 };

    for (const row of rows) {
      totalCostUSD += row.costUSD;
      // Hypothetical cost if all ran on gpt-4o-mini
      const hypothetical = (row.tokensIn / 1000) * 0.00015 + (row.tokensOut / 1000) * 0.0006;
      totalHypotheticalCost += hypothetical;

      byModel[row.modelUsed] = (byModel[row.modelUsed] ?? 0) + row.costUSD;
      if (row.routingDecision in byRoute) {
        byRoute[row.routingDecision] += row.costUSD;
      }
    }

    const savingsVsAllCloudUSD = totalHypotheticalCost - totalCostUSD;
    const savingsPercent = totalHypotheticalCost > 0
      ? (savingsVsAllCloudUSD / totalHypotheticalCost) * 100
      : 0;

    const inrRate = await getInrRate();

    return {
      totalCostUSD: Math.round(totalCostUSD * 100000) / 100000,
      totalCostINR: Math.round(totalCostUSD * inrRate * 100) / 100,
      savingsVsAllCloudUSD: Math.round(savingsVsAllCloudUSD * 100000) / 100000,
      savingsPercent: Math.round(savingsPercent * 10) / 10,
      byModel,
      byRoute: byRoute as Record<RoutingTarget, number>,
      executionCount: rows.length,
    };
  }

  async getRows(opts: {
    workflowId?: string;
    sensitivity?: string;
    page: number;
    limit: number;
  }): Promise<{ rows: AuditRow[]; total: number }> {
    const qb = this.repo.createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    if (opts.workflowId) {
      qb.andWhere('log.workflowId = :workflowId', { workflowId: opts.workflowId });
    }
    if (opts.sensitivity) {
      qb.andWhere('log.sensitivityLevel = :sensitivity', { sensitivity: opts.sensitivity });
    }

    const total = await qb.getCount();
    const rows = await qb
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit)
      .getMany();

    return {
      rows: rows.map(r => ({
        id: r.id,
        workflowId: r.workflowId,
        executionId: r.executionId,
        nodeId: r.nodeId,
        sensitivityLevel: r.sensitivityLevel as AuditRow['sensitivityLevel'],
        detectedPatterns: r.detectedPatterns,
        routingDecision: r.routingDecision as AuditRow['routingDecision'],
        modelUsed: r.modelUsed,
        costUSD: r.costUSD,
        latencyMs: r.latencyMs,
        tokensIn: r.tokensIn,
        tokensOut: r.tokensOut,
        sanitizerApplied: r.sanitizerApplied,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }
}
