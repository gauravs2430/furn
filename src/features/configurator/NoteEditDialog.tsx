import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export type NoteType = 'customerNotes' | 'internalNotes' | 'supplierNotes'

const NOTE_TITLES: Record<NoteType, string> = {
  customerNotes: 'Customer Notes',
  internalNotes: 'Internal Notes',
  supplierNotes: 'Supplier Notes',
}

interface NoteEditDialogProps {
  open: boolean
  noteType: NoteType | null
  currentValue: string
  onOpenChange: (open: boolean) => void
  onSave: (noteType: NoteType, value: string) => Promise<boolean | void> | void
}

interface NoteDialogContentProps {
  noteType: NoteType
  initialValue: string
  onOpenChange: (open: boolean) => void
  onSave: (noteType: NoteType, value: string) => Promise<boolean | void> | void
}

function NoteDialogForm({
  noteType,
  initialValue,
  onOpenChange,
  onSave,
}: NoteDialogContentProps) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const title = NOTE_TITLES[noteType]

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await onSave(noteType, value)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Content className="dialog note-dialog" aria-describedby={undefined}>
      <div className="note-dialog-header">
        <Dialog.Title className="note-dialog-title">{title}</Dialog.Title>
        <Dialog.Close className="note-dialog-close" aria-label="Close">
          <X size={20} strokeWidth={2} />
        </Dialog.Close>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="note-dialog-form">
        <div className="note-dialog-body">
          <textarea
            className="note-dialog-textarea"
            value={value}
            placeholder={title}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            rows={11}
          />
        </div>

        <div className="note-dialog-footer">
          <button
            type="button"
            className="note-dialog-btn-cancel"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="note-dialog-btn-save"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Dialog.Content>
  )
}

export function NoteEditDialog({
  open,
  noteType,
  currentValue,
  onOpenChange,
  onSave,
}: NoteEditDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        {noteType ? (
          <NoteDialogForm
            key={noteType}
            noteType={noteType}
            initialValue={currentValue}
            onOpenChange={onOpenChange}
            onSave={onSave}
          />
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  )
}
