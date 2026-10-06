import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './Button.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog">
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="dialog-copy">{description}</Dialog.Description>
          {children}
          <div className="dialog-actions">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface BlockingDialogProps {
  open: boolean
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

export function BlockingDialog({ open, title, description, actionLabel, onAction }: BlockingDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={() => {}}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="dialog-copy">{description}</Dialog.Description>
          <div className="dialog-actions">
            <Button onClick={onAction}>{actionLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ModalProps {
  open: boolean
  title: string
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
}

export function Modal({ open, title, onOpenChange, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={className ? `dialog dialog-wide ${className}` : 'dialog dialog-wide'}>
          <div className="dialog-head">
            <Dialog.Title className="dialog-title">{title}</Dialog.Title>
            <Dialog.Close className="icon-x" aria-label="Close">
              ×
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
