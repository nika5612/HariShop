import React from 'react'

const ConfirmDeleteModal = ({
  show,
  title,
  confirmText = 'Xoá',
  cancelText = 'Huỷ',
  onConfirm,
  onCancel,
}) => {
  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onCancel}
      role='dialog'
      aria-modal='true'
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          background: '#0f0f23',
          border: '1px solid rgba(51,255,204,0.35)',
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          padding: '18px 18px 16px',
          color: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          {title}
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <button
            type='button'
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#b8bcc8',
              borderRadius: 10,
              padding: '10px 18px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>

          <button
            type='button'
            onClick={onConfirm}
            style={{
              background: '#ff6b6b',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDeleteModal

