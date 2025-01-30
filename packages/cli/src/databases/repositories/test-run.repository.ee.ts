import { Service } from '@n8n/di';
import type { EntityManager, FindManyOptions } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import type { AggregatedTestRunMetrics } from '@/databases/entities/test-run.ee';
import { TestRun } from '@/databases/entities/test-run.ee';
import type { TestRunErrorCode } from '@/evaluation.ee/test-runner/errors.ee';
import { getTestRunFinalResult } from '@/evaluation.ee/test-runner/utils.ee';
import type { ListQuery } from '@/requests';

export type TestRunSummary = TestRun & {
	finalResult: 'success' | 'error' | 'warning';
};

@Service()
export class TestRunRepository extends Repository<TestRun> {
	constructor(dataSource: DataSource) {
		super(TestRun, dataSource.manager);
	}

	async createTestRun(testDefinitionId: string) {
		const testRun = this.create({
			status: 'new',
			testDefinition: { id: testDefinitionId },
		});

		return await this.save(testRun);
	}

	async markAsRunning(id: string, totalCases: number) {
		return await this.update(id, {
			status: 'running',
			runAt: new Date(),
			totalCases,
			passedCases: 0,
			failedCases: 0,
		});
	}

	async markAsCompleted(id: string, metrics: AggregatedTestRunMetrics) {
		return await this.update(id, { status: 'completed', completedAt: new Date(), metrics });
	}

	async markAsCancelled(id: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.update(TestRun, id, { status: 'cancelled' });
	}

	async markAsError(id: string, errorCode: TestRunErrorCode, errorDetails?: IDataObject) {
		return await this.update(id, { status: 'error', errorCode, errorDetails });
	}

	async markAllIncompleteAsFailed() {
		return await this.update(
			{ status: In(['new', 'running']) },
			{ status: 'error', errorCode: 'INTERRUPTED' },
		);
	}

	async incrementPassed(id: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.increment(TestRun, { id }, 'passedCases', 1);
	}

	async incrementFailed(id: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.increment(TestRun, { id }, 'failedCases', 1);
	}

	async getMany(testDefinitionId: string, options: ListQuery.Options) {
		// FIXME: optimize fetching final result of each test run
		const findManyOptions: FindManyOptions<TestRun> = {
			where: { testDefinition: { id: testDefinitionId } },
			order: { createdAt: 'DESC' },
			relations: ['testCaseExecutions'],
		};

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const testRuns = await this.find(findManyOptions);

		return testRuns.map(({ testCaseExecutions, ...testRun }) => {
			const finalResult =
				testRun.status === 'completed' ? getTestRunFinalResult(testCaseExecutions) : null;
			return { ...testRun, finalResult };
		});
	}
}
