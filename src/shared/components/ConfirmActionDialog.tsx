import { Dialog } from 'primereact/dialog'

type ConfirmActionDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmActionDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annulla',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  return (
    <Dialog
      header={title}
      visible={open}
      modal
      className="confirm-action-dialog"
      draggable={false}
      resizable={false}
      dismissableMask
      onHide={onCancel}
      footer={(
        <div className="confirm-action-footer">
          <button type="button" className="secondary-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={tone === 'danger' ? 'danger-btn' : 'primary-btn'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      )}
    >
      <p>{message}</p>
    </Dialog>
  )
}
