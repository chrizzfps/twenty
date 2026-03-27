import { In } from 'typeorm';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { CalendarEventCleanerService } from 'src/modules/calendar/calendar-event-cleaner/services/calendar-event-cleaner.service';
import { type CalendarChannelEventAssociationWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-channel-event-association.workspace-entity';

export type DeleteConnectedAccountAssociatedCalendarDataJobData = {
  workspaceId: string;
  connectedAccountId: string;
  calendarChannelIds?: string[];
};

@Processor(MessageQueue.calendarQueue)
export class DeleteConnectedAccountAssociatedCalendarDataJob {
  constructor(
    private readonly calendarEventCleanerService: CalendarEventCleanerService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  @Process(DeleteConnectedAccountAssociatedCalendarDataJob.name)
  async handle(
    data: DeleteConnectedAccountAssociatedCalendarDataJobData,
  ): Promise<void> {
    const { workspaceId, calendarChannelIds } = data;

    if (calendarChannelIds && calendarChannelIds.length > 0) {
      const authContext = buildSystemAuthContext(workspaceId);

      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const associationRepository =
            await this.globalWorkspaceOrmManager.getRepository<CalendarChannelEventAssociationWorkspaceEntity>(
              workspaceId,
              'calendarChannelEventAssociation',
            );

          await associationRepository.delete({
            calendarChannelId: In(calendarChannelIds),
          });
        },
        authContext,
      );
    }

    await this.calendarEventCleanerService.cleanWorkspaceCalendarEvents(
      workspaceId,
    );
  }
}
