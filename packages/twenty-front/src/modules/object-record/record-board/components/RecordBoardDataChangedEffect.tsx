import { useStore } from 'jotai';

import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { type ObjectRecordOperationBrowserEventDetail } from '@/browser-event/types/ObjectRecordOperationBrowserEventDetail';
import { useGetShouldInitializeRecordBoardForUpdateInputs } from '@/object-record/record-board/hooks/useGetShouldInitializeRecordBoardForUpdateInputs';
import { useRemoveRecordsFromBoard } from '@/object-record/record-board/hooks/useRemoveRecordsFromBoard';
import { useTriggerRecordBoardInitialQuery } from '@/object-record/record-board/hooks/useTriggerRecordBoardInitialQuery';
import { isRecordBoardDropProcessingComponentState } from '@/object-record/record-board/states/isRecordBoardDropProcessingComponentState';
import { recordGroupFromGroupValueComponentFamilySelector } from '@/object-record/record-group/states/selectors/recordGroupFromGroupValueComponentFamilySelector';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { recordIndexGroupFieldMetadataItemComponentState } from '@/object-record/record-index/states/recordIndexGroupFieldMetadataComponentState';
import { recordIndexRecordIdsByGroupComponentFamilyState } from '@/object-record/record-index/states/recordIndexRecordIdsByGroupComponentFamilyState';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomComponentFamilySelectorCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilySelectorCallbackState';
import { useAtomComponentFamilyStateCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateCallbackState';
import { useAtomComponentStateCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateCallbackState';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useDebouncedCallback } from 'use-debounce';

export const RecordBoardDataChangedEffect = () => {
  const store = useStore();
  const { objectMetadataItem } = useRecordIndexContextOrThrow();
  const { triggerRecordBoardInitialQuery } =
    useTriggerRecordBoardInitialQuery();
  const { getShouldInitializeRecordBoardForUpdateInputs } =
    useGetShouldInitializeRecordBoardForUpdateInputs();

  const recordGroupFromGroupValueCallbackState =
    useAtomComponentFamilySelectorCallbackState(
      recordGroupFromGroupValueComponentFamilySelector,
    );
  const recordIndexGroupFieldMetadataItem = useAtomComponentStateCallbackState(
    recordIndexGroupFieldMetadataItemComponentState,
  );
  const recordIndexRecordIdsByGroupCallbackState =
    useAtomComponentFamilyStateCallbackState(
      recordIndexRecordIdsByGroupComponentFamilyState,
    );

  const { removeRecordsFromBoard } = useRemoveRecordsFromBoard();

  const isRecordBoardDropProcessingCallbackState =
    useAtomComponentStateCallbackState(
      isRecordBoardDropProcessingComponentState,
    );

  // Temporarily disable drag during board data changes to prevent
  // @hello-pangea/dnd invariant errors when draggable components
  // unmount/remount during re-renders triggered by data mutations
  const debouncedReEnableDrag = useDebouncedCallback(() => {
    store.set(isRecordBoardDropProcessingCallbackState, false);
  }, 500);

  const disableDragDuringBoardUpdate = useCallback(() => {
    store.set(isRecordBoardDropProcessingCallbackState, true);
    debouncedReEnableDrag();
  }, [store, isRecordBoardDropProcessingCallbackState, debouncedReEnableDrag]);

  const handleObjectRecordOperation = useCallback(
    (
      objectRecordOperationEventDetail: ObjectRecordOperationBrowserEventDetail,
    ) => {
      const objectRecordOperation = objectRecordOperationEventDetail.operation;

      switch (objectRecordOperation.type) {
        case 'update-one':
        case 'update-many':
          {
            const updateInputs =
              objectRecordOperation.type === 'update-one'
                ? [objectRecordOperation.result.updateInput]
                : objectRecordOperation.result.updateInputs;

            const shouldInitializeForUpdateOperation =
              getShouldInitializeRecordBoardForUpdateInputs(updateInputs);

            if (shouldInitializeForUpdateOperation) {
              disableDragDuringBoardUpdate();
              triggerRecordBoardInitialQuery();
            }
          }
          break;
        case 'create-one': {
          if (objectRecordOperation.createdRecord.position === 'first') {
            disableDragDuringBoardUpdate();
            triggerRecordBoardInitialQuery();
          } else {
            const createdRecordPosition =
              objectRecordOperation.createdRecord.position;

            if (!isDefined(createdRecordPosition)) {
              return;
            }

            const currentRecordIndexGroupFieldMetadataItem = store.get(
              recordIndexGroupFieldMetadataItem,
            );

            if (!isDefined(currentRecordIndexGroupFieldMetadataItem)) {
              return;
            }

            const recordGroupValue =
              objectRecordOperation.createdRecord[
                currentRecordIndexGroupFieldMetadataItem.name
              ];

            const recordGroupDefinitionFromGroupValue = store.get(
              recordGroupFromGroupValueCallbackState({ recordGroupValue }),
            );

            if (!isDefined(recordGroupDefinitionFromGroupValue)) {
              return;
            }

            const recordIdsForGroup = store.get(
              recordIndexRecordIdsByGroupCallbackState(
                recordGroupDefinitionFromGroupValue.id,
              ),
            );

            const recordIdsWithoutCreatedRecord = recordIdsForGroup.filter(
              (recordId) => recordId !== objectRecordOperation.createdRecord.id,
            );

            const groupIsEmpty = recordIdsWithoutCreatedRecord.length === 0;

            if (groupIsEmpty) {
              disableDragDuringBoardUpdate();
              triggerRecordBoardInitialQuery();
              return;
            }

            const firstRecordIdInGroup = recordIdsWithoutCreatedRecord[0];
            const firstExistingRecordInGroup = store.get(
              recordStoreFamilyState.atomFamily(firstRecordIdInGroup),
            ) as { position?: number } | null | undefined;

            if (!isDefined(firstExistingRecordInGroup)) {
              return;
            }

            if (
              createdRecordPosition < (firstExistingRecordInGroup.position ?? 0)
            ) {
              disableDragDuringBoardUpdate();
              triggerRecordBoardInitialQuery();
            }
          }
          break;
        }
        case 'delete-one': {
          const removedRecordId = objectRecordOperation.deletedRecordId;

          disableDragDuringBoardUpdate();
          removeRecordsFromBoard({
            recordIdsToRemove: [removedRecordId],
          });
          return;
        }
        case 'delete-many': {
          const removedRecordIds = objectRecordOperation.deletedRecordIds;

          disableDragDuringBoardUpdate();
          removeRecordsFromBoard({
            recordIdsToRemove: removedRecordIds,
          });
          return;
        }
        case 'restore-many':
        case 'restore-one': {
          return;
        }
        default: {
          disableDragDuringBoardUpdate();
          triggerRecordBoardInitialQuery();
        }
      }
    },
    [
      store,
      triggerRecordBoardInitialQuery,
      getShouldInitializeRecordBoardForUpdateInputs,
      recordIndexGroupFieldMetadataItem,
      recordGroupFromGroupValueCallbackState,
      recordIndexRecordIdsByGroupCallbackState,
      removeRecordsFromBoard,
      disableDragDuringBoardUpdate,
    ],
  );

  useListenToObjectRecordOperationBrowserEvent({
    onObjectRecordOperationBrowserEvent: handleObjectRecordOperation,
    objectMetadataItemId: objectMetadataItem.id,
  });

  return null;
};
