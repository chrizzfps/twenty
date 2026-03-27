import { Scope } from '@nestjs/common';

import { In } from 'typeorm';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type MessageChannelMessageAssociationWorkspaceEntity } from 'src/modules/messaging/common/standard-objects/message-channel-message-association.workspace-entity';
import { MessagingMessageCleanerService } from 'src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service';

export type MessagingConnectedAccountDeletionCleanupJobData = {
  workspaceId: string;
  connectedAccountId: string;
  messageChannelIds?: string[];
};

@Processor({
  queueName: MessageQueue.messagingQueue,
  scope: Scope.REQUEST,
})
export class MessagingConnectedAccountDeletionCleanupJob {
  constructor(
    private readonly messageCleanerService: MessagingMessageCleanerService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  @Process(MessagingConnectedAccountDeletionCleanupJob.name)
  async handle(
    data: MessagingConnectedAccountDeletionCleanupJobData,
  ): Promise<void> {
    const { workspaceId, messageChannelIds } = data;

    if (messageChannelIds && messageChannelIds.length > 0) {
      const authContext = buildSystemAuthContext(workspaceId);

      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const associationRepository =
            await this.globalWorkspaceOrmManager.getRepository<MessageChannelMessageAssociationWorkspaceEntity>(
              workspaceId,
              'messageChannelMessageAssociation',
            );

          await associationRepository.delete({
            messageChannelId: In(messageChannelIds),
          });
        },
        authContext,
      );
    }

    await this.messageCleanerService.cleanOrphanMessagesAndThreads(
      workspaceId,
    );
  }
}
