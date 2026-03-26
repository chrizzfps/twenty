import { type AllMetadataName } from 'twenty-shared/metadata';

import { type WorkspaceMigrationOrchestratorFailedResult } from 'src/engine/workspace-manager/workspace-migration/types/workspace-migration-orchestrator.type';

export class WorkspaceMigrationBuilderException extends Error {
  constructor(
    public readonly failedWorkspaceMigrationBuildResult: WorkspaceMigrationOrchestratorFailedResult,
    message = 'Workspace migration builder failed',
  ) {
    super(
      `${message}: ${WorkspaceMigrationBuilderException.extractErrorDetails(failedWorkspaceMigrationBuildResult)}`,
    );
    this.name = 'WorkspaceMigrationBuilderException';
  }

  private static extractErrorDetails(
    result: WorkspaceMigrationOrchestratorFailedResult,
  ): string {
    const errorMessages: string[] = [];

    for (const metadataName of Object.keys(result.report) as AllMetadataName[]) {
      const validations = result.report[metadataName];

      for (const validation of validations) {
        for (const error of validation.errors) {
          errorMessages.push(`[${error.code}] ${error.message}`);
        }
      }
    }

    return errorMessages.length > 0
      ? errorMessages.join(', ')
      : 'unknown validation error';
  }
}
