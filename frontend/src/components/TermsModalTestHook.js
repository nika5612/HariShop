import React, { useEffect } from 'react'

// Small helper component for dev/debug (optional). Not used in production.
const TermsModalTestHook = ({ onOpened }) => {
  useEffect(() => {
    if (typeof onOpened === 'function') onOpened()
  }, [onOpened])

  return null
}

export default TermsModalTestHook

