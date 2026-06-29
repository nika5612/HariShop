import React from 'react'

const Message = ({ variant, children }) => {
  return (
    <div className={`message-modern message-${variant || 'info'}`}> 
      {children}
    </div>
  )
}

Message.defaultProps = {
  variant: 'info',
}

export default Message

