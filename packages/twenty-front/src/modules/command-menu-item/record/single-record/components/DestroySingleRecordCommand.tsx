import { CommandModal } from '@/command-menu-item/display/components/CommandModal';
import { useSelectedRecordIdOrNull } from '@/command-menu-item/record/single-record/hooks/useSelectedRecordIdOrNull';
import { useDestroyOneRecord } from '@/object-record/hooks/useDestroyOneRecord';
import { useRemoveSelectedRecordsFromRecordBoard } from '@/object-record/record-board/hooks/useRemoveSelectedRecordsFromRecordBoard';
import { useRecordIndexIdFromCurrentContextStore } from '@/object-record/record-index/hooks/useRecordIndexIdFromCurrentContextStore';
import { useResetTableRowSelection } from '@/object-record/record-table/hooks/internal/useResetTableRowSelection';
import { t } from '@lingui/core/macro';
import { AppPath } from 'twenty-shared/types';
import { useNavigateApp } from '~/hooks/useNavigateApp';

export const DestroySingleRecordCommand = () => {
  const { recordIndexId, objectMetadataItem } =
    useRecordIndexIdFromCurrentContextStore();

  const recordId = useSelectedRecordIdOrNull();

  const navigateApp = useNavigateApp();

  const { resetTableRowSelection } = useResetTableRowSelection(recordIndexId);

  const { removeSelectedRecordsFromRecordBoard } =
    useRemoveSelectedRecordsFromRecordBoard(recordIndexId);

  const { destroyOneRecord } = useDestroyOneRecord({
    objectNameSingular: objectMetadataItem.nameSingular,
  });

  const handleDeleteClick = async () => {
    if (!recordId) {
      return;
    }

    removeSelectedRecordsFromRecordBoard();
    resetTableRowSelection();

    await destroyOneRecord(recordId);
    navigateApp(AppPath.RecordIndexPage, {
      objectNamePlural: objectMetadataItem.namePlural,
    });
  };

  if (!recordId) {
    return null;
  }

  return (
    <CommandModal
      title={t`Permanently Destroy Record`}
      subtitle={t`Are you sure you want to destroy this record? It cannot be recovered anymore.`}
      onConfirmClick={handleDeleteClick}
      confirmButtonText={t`Permanently Destroy Record`}
      closeSidePanelOnShowPageOptionsExecution={true}
    />
  );
};
