import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'class-validator';
import { type ObjectRecord } from 'twenty-shared/types';
import { In, MoreThan } from 'typeorm';

import { objectRecordDiffMerge } from 'src/engine/core-modules/event-emitter/utils/object-record-diff-merge';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { buildFieldMapsFromFlatObjectMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-field-maps-from-flat-object-metadata.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type TimelineActivityPayload } from 'src/modules/timeline/types/timeline-activity-payload';
import { buildTimelineActivityRelatedMorphFieldMetadataName } from 'src/modules/timeline/utils/timeline-activity-related-morph-field-metadata-name-builder.util';

type TimelineActivityPayloadWorkspaceIdAndObjectSingularName = {
  payloads: (Omit<TimelineActivityPayload, 'properties'> & {
    properties: Pick<TimelineActivityPayload['properties'], 'diff'>;
  })[];
  workspaceId: string;
  objectSingularName: string;
};

@Injectable()
export class TimelineActivityRepository {
  private readonly logger = new Logger(TimelineActivityRepository.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  async upsertTimelineActivities({
    objectSingularName,
    workspaceId,
    payloads,
  }: TimelineActivityPayloadWorkspaceIdAndObjectSingularName) {
    const timelineActivityPropertyName =
      await this.getTimelineActivityPropertyName(objectSingularName);

    const hasMorphRelationField =
      await this.hasTimelineActivityMorphRelationField(
        workspaceId,
        timelineActivityPropertyName,
      );

    if (!hasMorphRelationField) {
      this.logger.warn(
        `Skipping timeline activity upsert: morph relation field "${timelineActivityPropertyName}" is missing in timelineActivity metadata for object "${objectSingularName}" in workspace ${workspaceId}. Run workspace:sync-metadata to fix.`,
      );

      return;
    }

    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const recentTimelineActivities = await this.findRecentTimelineActivities({
        objectSingularName,
        workspaceId,
        payloads,
      });

      const payloadsWithDiff = payloads
        .filter(({ properties }) => {
          const isDiffEmpty =
            properties.diff !== null &&
            properties.diff &&
            Object.keys(properties.diff).length === 0;

          return !isDiffEmpty;
        })
        .map(({ properties, ...rest }) => ({
          ...rest,
          properties: isDefined(properties.diff)
            ? { diff: properties.diff }
            : {},
        }));

      const payloadsToInsert: TimelineActivityPayloadWorkspaceIdAndObjectSingularName['payloads'] =
        [];

      const timelineActivityPropertyName =
        await this.getTimelineActivityPropertyName(objectSingularName);

      for (const payload of payloadsWithDiff) {
        const recentTimelineActivity = recentTimelineActivities.find(
          (timelineActivity) =>
            timelineActivity[timelineActivityPropertyName] ===
              payload.recordId &&
            timelineActivity.workspaceMemberId === payload.workspaceMemberId &&
            (!isDefined(payload.linkedRecordId) ||
              timelineActivity.linkedRecordId === payload.linkedRecordId) &&
            timelineActivity.name === payload.name,
        );

        if (recentTimelineActivity) {
          const mergedProperties = objectRecordDiffMerge(
            recentTimelineActivity.properties,
            payload.properties,
          );

          await this.updateTimelineActivity({
            id: recentTimelineActivity.id,
            properties: mergedProperties,
            workspaceMemberId: payload.workspaceMemberId,
            workspaceId,
          });
        } else {
          payloadsToInsert.push(payload);
        }
      }

      await this.insertTimelineActivities({
        objectSingularName,
        payloads: payloadsToInsert,
        workspaceId,
      });
    }, authContext);
  }

  private async findRecentTimelineActivities({
    objectSingularName,
    workspaceId,
    payloads,
  }: TimelineActivityPayloadWorkspaceIdAndObjectSingularName) {
    const timelineActivityTypeORMRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        'timelineActivity',
        {
          shouldBypassPermissionChecks: true,
        },
      );

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const timelineActivityPropertyName =
      await this.getTimelineActivityPropertyName(objectSingularName);

    const whereConditions: Record<string, unknown> = {
      [timelineActivityPropertyName]: In(
        payloads.map((payload) => payload.recordId),
      ),
      name: In(payloads.map((payload) => payload.name)),
      workspaceMemberId: In(
        payloads.map((payload) => payload.workspaceMemberId || null),
      ),
      createdAt: MoreThan(tenMinutesAgo),
    };

    return await timelineActivityTypeORMRepository.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      take: 1,
    });
  }

  public async insertTimelineActivities({
    objectSingularName,
    workspaceId,
    payloads,
  }: TimelineActivityPayloadWorkspaceIdAndObjectSingularName) {
    if (payloads.length === 0) {
      return;
    }

    const timelineActivityTypeORMRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        'timelineActivity',
        {
          shouldBypassPermissionChecks: true,
        },
      );

    const timelineActivityPropertyName =
      await this.getTimelineActivityPropertyName(objectSingularName);

    return timelineActivityTypeORMRepository.insert(
      payloads.map((payload) => ({
        name: payload.name,
        properties: payload.properties,
        workspaceMemberId: payload.workspaceMemberId,
        [timelineActivityPropertyName]: payload.recordId,
        linkedRecordCachedName: payload.linkedRecordCachedName ?? '',
        linkedRecordId: payload.linkedRecordId,
        linkedObjectMetadataId: payload.linkedObjectMetadataId,
      })),
    );
  }

  private async updateTimelineActivity({
    id,
    properties,
    workspaceMemberId,
    workspaceId,
  }: {
    id: string;
    properties: Partial<ObjectRecord>;
    workspaceMemberId: string | undefined;
    workspaceId: string;
  }) {
    const timelineActivityTypeORMRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        'timelineActivity',
        {
          shouldBypassPermissionChecks: true,
        },
      );

    return timelineActivityTypeORMRepository.update(id, {
      properties: properties,
      workspaceMemberId: workspaceMemberId,
    });
  }

  private async getTimelineActivityPropertyName(objectSingularName: string) {
    return `${buildTimelineActivityRelatedMorphFieldMetadataName(objectSingularName)}Id`;
  }

  private async hasTimelineActivityMorphRelationField(
    workspaceId: string,
    joinColumnName: string,
  ): Promise<boolean> {
    const { flatFieldMetadataMaps, flatObjectMetadataMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatFieldMetadataMaps', 'flatObjectMetadataMaps'],
        },
      );

    const timelineActivityObjectMetadata = Object.values(
      flatObjectMetadataMaps.byId,
    ).find(
      (objectMetadata) => objectMetadata?.nameSingular === 'timelineActivity',
    );

    if (!timelineActivityObjectMetadata) {
      return false;
    }

    const { fieldIdByJoinColumnName } = buildFieldMapsFromFlatObjectMetadata(
      flatFieldMetadataMaps,
      timelineActivityObjectMetadata,
    );

    return isDefined(fieldIdByJoinColumnName[joinColumnName]);
  }
}
