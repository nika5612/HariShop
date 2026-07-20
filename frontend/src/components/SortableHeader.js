import React from 'react'
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'

const SortableHeader = ({ label, sortKey, sortConfig, onSort, sortable = true }) => {
  if (!sortable) {
    return <th>{label}</th>
  }

  const isActive = sortConfig?.key === sortKey
  const direction = isActive ? sortConfig.direction : null

  let Icon = FaSort
  if (direction === 'desc') Icon = FaSortDown
  else if (direction === 'asc') Icon = FaSortUp

  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        color: isActive ? '#0d6efd' : undefined,
        fontWeight: isActive ? 700 : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.color = '#0d6efd'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.color = ''
      }}
      title={`Sắp xếp theo ${label}`}
    >
      {label}{' '}
      <Icon
        size={12}
        style={{
          marginLeft: 4,
          verticalAlign: 'middle',
          color: isActive ? '#0d6efd' : '#adb5bd',
        }}
      />
    </th>
  )
}

export default SortableHeader