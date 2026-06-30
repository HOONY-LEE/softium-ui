import { Check, Pencil, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTableContext } from './context';

/**
 * Edit-mode controls for the DataGrid, rendered on the right of the toolbar.
 *
 *  - editMode='toggle', not editing →  [✎ 편집]   (enter edit mode)
 *  - editing + commitMode='batch'   →  [취소] [저장 (N)]  (discard / flush staged edits)
 *  - editing + commitMode='cell'    →  [완료]   (leave edit mode; edits already saved)
 *
 * When editMode='always' + commitMode='cell' there is nothing to show.
 */
export function EditControls<T>(): ReactNode {
  const {
    editable,
    editMode,
    commitMode,
    editEnabled,
    enableEdit,
    exitEdit,
    dirtyCount,
    saveAll,
    discardAll,
    messages,
  } = useTableContext<T>();

  if (!editable) return null;
  if (editMode === 'always' && commitMode === 'cell') return null;

  // toggle mode, currently read-only → show the Edit button
  if (!editEnabled) {
    return (
      <div className="sft-editctl">
        <button type="button" className="sft-editctl__btn" onClick={enableEdit}>
          <Pencil size={14} />
          <span>{messages.editButton}</span>
        </button>
      </div>
    );
  }

  // editing now: batch shows Cancel + Save, cell mode shows Done
  const leaveAfter = editMode === 'toggle';
  const onSave = () => {
    saveAll();
    if (leaveAfter) exitEdit();
  };
  const onCancel = () => {
    discardAll();
    if (leaveAfter) exitEdit();
  };

  if (commitMode === 'batch') {
    return (
      <div className="sft-editctl">
        <button type="button" className="sft-editctl__btn" onClick={onCancel}>
          <X size={14} />
          <span>{messages.discardChanges}</span>
        </button>
        <button
          type="button"
          className="sft-editctl__btn sft-editctl__btn--primary"
          onClick={onSave}
          disabled={dirtyCount === 0}
        >
          <Check size={14} />
          <span>{messages.saveChanges(dirtyCount)}</span>
        </button>
      </div>
    );
  }

  // cell mode + toggle → just an exit button (edits are already persisted)
  return (
    <div className="sft-editctl">
      <button
        type="button"
        className="sft-editctl__btn sft-editctl__btn--primary"
        onClick={exitEdit}
      >
        <Check size={14} />
        <span>{messages.doneEdit}</span>
      </button>
    </div>
  );
}
