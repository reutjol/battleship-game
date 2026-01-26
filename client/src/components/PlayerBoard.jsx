import React, { useCallback } from 'react'
import Board from './Board'

const PlayerBoard = ({ board }) => {
  const cellClass = useCallback((cell) => {
    if (cell.status === 'sunk') return `cell-sunk ship-${cell.shipIndex}`
    if (cell.status === 'hit') return 'cell-hit'
    if (cell.status === 'miss') return 'cell-miss'
    if (cell.status === 'ship') return `cell-ship ship-${cell.shipIndex}`
    return ''
  }, [])

  return (
    <Board
      title="Your Board"
      cells={board}
      getCellClassName={cellClass}
    />
  )
}

export default PlayerBoard
