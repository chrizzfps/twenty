import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { WorkspaceCacheProvider } from 'src/engine/workspace-cache/interfaces/workspace-cache-provider.service';

import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { FieldMetadataEntity } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { FlatViewFieldMaps } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field-maps.type';
import { fromViewFieldEntityToFlatViewField } from 'src/engine/metadata-modules/flat-view-field/utils/from-view-field-entity-to-flat-view-field.util';
import { ViewFieldGroupEntity } from 'src/engine/metadata-modules/view-field-group/entities/view-field-group.entity';
import { ViewFieldEntity } from 'src/engine/metadata-modules/view-field/entities/view-field.entity';
import { ViewEntity } from 'src/engine/metadata-modules/view/entities/view.entity';
import { WorkspaceCache } from 'src/engine/workspace-cache/decorators/workspace-cache.decorator';
import { createIdToUniversalIdentifierMap } from 'src/engine/workspace-cache/utils/create-id-to-universal-identifier-map.util';
import { addFlatEntityToFlatEntityMapsThroughMutationOrThrow } from 'src/engine/workspace-manager/workspace-migration/utils/add-flat-entity-to-flat-entity-maps-through-mutation-or-throw.util';

@Injectable()
@WorkspaceCache('flatViewFieldMaps')
export class WorkspaceFlatViewFieldMapCacheService extends WorkspaceCacheProvider<FlatViewFieldMaps> {
  private readonly logger = new Logger(
    WorkspaceFlatViewFieldMapCacheService.name,
  );

  constructor(
    @InjectRepository(ViewFieldEntity)
    private readonly viewFieldRepository: Repository<ViewFieldEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(FieldMetadataEntity)
    private readonly fieldMetadataRepository: Repository<FieldMetadataEntity>,
    @InjectRepository(ViewEntity)
    private readonly viewRepository: Repository<ViewEntity>,
    @InjectRepository(ViewFieldGroupEntity)
    private readonly viewFieldGroupRepository: Repository<ViewFieldGroupEntity>,
  ) {
    super();
  }

  async computeForCache(workspaceId: string): Promise<FlatViewFieldMaps> {
    const [viewFields, applications, fieldMetadatas, views, viewFieldGroups] =
      await Promise.all([
        this.viewFieldRepository.find({
          where: { workspaceId },
          withDeleted: true,
        }),
        this.applicationRepository.find({
          where: { workspaceId },
          select: ['id', 'universalIdentifier'],
          withDeleted: true,
        }),
        this.fieldMetadataRepository.find({
          where: { workspaceId },
          select: ['id', 'universalIdentifier'],
          withDeleted: true,
        }),
        this.viewRepository.find({
          where: { workspaceId },
          select: ['id', 'universalIdentifier'],
          withDeleted: true,
        }),
        this.viewFieldGroupRepository.find({
          where: { workspaceId },
          select: ['id', 'universalIdentifier'],
          withDeleted: true,
        }),
      ]);

    const applicationIdToUniversalIdentifierMap =
      createIdToUniversalIdentifierMap(applications);
    const fieldMetadataIdToUniversalIdentifierMap =
      createIdToUniversalIdentifierMap(fieldMetadatas);
    const viewIdToUniversalIdentifierMap =
      createIdToUniversalIdentifierMap(views);
    const viewFieldGroupIdToUniversalIdentifierMap =
      createIdToUniversalIdentifierMap(viewFieldGroups);

    // Parallel queries without a shared transaction can observe different
    // snapshots under READ COMMITTED isolation. A concurrent FieldMetadata
    // hard-delete (with FK CASCADE on ViewField) that commits between the
    // ViewField and FieldMetadata queries leaves orphaned ViewField rows
    // in the result set. Filter them out to avoid failing the entire cache.
    const consistentViewFields = viewFields.filter((viewFieldEntity) => {
      const hasFieldMetadata = isDefined(
        fieldMetadataIdToUniversalIdentifierMap.get(
          viewFieldEntity.fieldMetadataId,
        ),
      );

      if (!hasFieldMetadata) {
        this.logger.warn(
          `Skipping orphaned ViewField ${viewFieldEntity.id}: FieldMetadata ${viewFieldEntity.fieldMetadataId} not found (workspace ${workspaceId})`,
        );
      }

      return hasFieldMetadata;
    });

    const flatViewFieldMaps = createEmptyFlatEntityMaps();

    for (const viewFieldEntity of consistentViewFields) {
      const flatViewField = fromViewFieldEntityToFlatViewField({
        entity: viewFieldEntity,
        applicationIdToUniversalIdentifierMap,
        fieldMetadataIdToUniversalIdentifierMap,
        viewIdToUniversalIdentifierMap,
        viewFieldGroupIdToUniversalIdentifierMap,
      });

      addFlatEntityToFlatEntityMapsThroughMutationOrThrow({
        flatEntity: flatViewField,
        flatEntityMapsToMutate: flatViewFieldMaps,
      });
    }

    return flatViewFieldMaps;
  }
}
