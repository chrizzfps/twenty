import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import {
  ConnectedAccountException,
  ConnectedAccountExceptionCode,
} from 'src/engine/metadata-modules/connected-account/connected-account.exception';
import { ConnectedAccountDTO } from 'src/engine/metadata-modules/connected-account/dtos/connected-account.dto';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import {
  DeleteConnectedAccountAssociatedCalendarDataJob,
  type DeleteConnectedAccountAssociatedCalendarDataJobData,
} from 'src/modules/calendar/calendar-event-cleaner/jobs/delete-connected-account-associated-calendar-data.job';
import {
  MessagingConnectedAccountDeletionCleanupJob,
  type MessagingConnectedAccountDeletionCleanupJobData,
} from 'src/modules/messaging/message-cleaner/jobs/messaging-connected-account-deletion-cleanup.job';

@Injectable()
export class ConnectedAccountMetadataService {
  constructor(
    @InjectRepository(ConnectedAccountEntity)
    private readonly repository: Repository<ConnectedAccountEntity>,
    @InjectRepository(MessageChannelEntity)
    private readonly messageChannelRepository: Repository<MessageChannelEntity>,
    @InjectRepository(CalendarChannelEntity)
    private readonly calendarChannelRepository: Repository<CalendarChannelEntity>,
    @InjectMessageQueue(MessageQueue.messagingQueue)
    private readonly messagingQueueService: MessageQueueService,
    @InjectMessageQueue(MessageQueue.calendarQueue)
    private readonly calendarQueueService: MessageQueueService,
  ) {}

  async findAll(workspaceId: string): Promise<ConnectedAccountDTO[]> {
    return this.repository.find({ where: { workspaceId } });
  }

  async findByUserWorkspaceId({
    userWorkspaceId,
    workspaceId,
  }: {
    userWorkspaceId: string;
    workspaceId: string;
  }): Promise<ConnectedAccountDTO[]> {
    return this.repository.find({
      where: { userWorkspaceId, workspaceId },
    });
  }

  async findById({
    id,
    workspaceId,
  }: {
    id: string;
    workspaceId: string;
  }): Promise<ConnectedAccountDTO | null> {
    return this.repository.findOne({ where: { id, workspaceId } });
  }

  async findByIds({
    ids,
    workspaceId,
  }: {
    ids: string[];
    workspaceId: string;
  }): Promise<ConnectedAccountDTO[]> {
    return this.repository.find({
      where: { id: In(ids), workspaceId },
    });
  }

  async verifyOwnership({
    id,
    userWorkspaceId,
    workspaceId,
  }: {
    id: string;
    userWorkspaceId: string;
    workspaceId: string;
  }): Promise<ConnectedAccountEntity> {
    const connectedAccount = await this.repository.findOne({
      where: { id, workspaceId },
    });

    if (!connectedAccount) {
      throw new ConnectedAccountException(
        `Connected account ${id} not found`,
        ConnectedAccountExceptionCode.CONNECTED_ACCOUNT_NOT_FOUND,
      );
    }

    if (connectedAccount.userWorkspaceId !== userWorkspaceId) {
      throw new ConnectedAccountException(
        `Connected account ${id} does not belong to user workspace ${userWorkspaceId}`,
        ConnectedAccountExceptionCode.CONNECTED_ACCOUNT_OWNERSHIP_VIOLATION,
      );
    }

    return connectedAccount;
  }

  async getUserConnectedAccountIds({
    userWorkspaceId,
    workspaceId,
  }: {
    userWorkspaceId: string;
    workspaceId: string;
  }): Promise<string[]> {
    const accounts = await this.repository.find({
      where: { userWorkspaceId, workspaceId },
      select: ['id'],
    });

    return accounts.map((account) => account.id);
  }

  async create(
    data: Partial<ConnectedAccountEntity> & {
      workspaceId: string;
      handle: string;
      provider: string;
      userWorkspaceId: string;
    },
  ): Promise<ConnectedAccountDTO> {
    const entity = this.repository.create(data);

    return this.repository.save(entity);
  }

  async update({
    id,
    workspaceId,
    data,
  }: {
    id: string;
    workspaceId: string;
    data: Partial<ConnectedAccountEntity>;
  }): Promise<ConnectedAccountDTO> {
    await this.repository.update(
      { id, workspaceId },
      data as Record<string, unknown>,
    );

    return this.repository.findOneOrFail({ where: { id, workspaceId } });
  }

  async delete({
    id,
    workspaceId,
  }: {
    id: string;
    workspaceId: string;
  }): Promise<ConnectedAccountDTO> {
    const connectedAccount = await this.repository.findOneOrFail({
      where: { id, workspaceId },
    });

    // Capture channel IDs before cascade deletes them
    const messageChannels = await this.messageChannelRepository.find({
      where: { connectedAccountId: id, workspaceId },
      select: ['id'],
    });

    const calendarChannels = await this.calendarChannelRepository.find({
      where: { connectedAccountId: id, workspaceId },
      select: ['id'],
    });

    // Enqueue cleanup jobs with channel IDs so workers can delete
    // workspace-side associations that core cascade can't reach
    if (messageChannels.length > 0) {
      await this.messagingQueueService.add<MessagingConnectedAccountDeletionCleanupJobData>(
        MessagingConnectedAccountDeletionCleanupJob.name,
        {
          workspaceId,
          connectedAccountId: id,
          messageChannelIds: messageChannels.map((ch) => ch.id),
        },
      );
    }

    if (calendarChannels.length > 0) {
      await this.calendarQueueService.add<DeleteConnectedAccountAssociatedCalendarDataJobData>(
        DeleteConnectedAccountAssociatedCalendarDataJob.name,
        {
          workspaceId,
          connectedAccountId: id,
          calendarChannelIds: calendarChannels.map((ch) => ch.id),
        },
      );
    }

    await this.repository.delete({ id, workspaceId });

    return connectedAccount;
  }
}
