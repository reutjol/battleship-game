import { useCallback } from 'react'
import Board from './Board'

const OpponentBoard = ({ board, onAttack, disabled }) => {
  const handleCellClick = useCallback((cell) => {
    if (disabled) return
    if (cell.status !== 'empty') return
    onAttack(cell.row, cell.col)
  }, [disabled, onAttack])

  const cellClass = useCallback((cell) => {
    if (cell.status === 'sunk') return `cell-sunk ship-${cell.shipIndex}`
    if (cell.status === 'hit') return 'cell-hit'
    if (cell.status === 'miss') return 'cell-miss'
    return ''
  }, [])

  return (
    <Board
      title="Opponent Board"
      cells={board}
      onCellClick={handleCellClick}
      getCellClassName={cellClass}
      className={`opponent-board ${disabled ? 'disabled' : ''}`}
    />
  )
}

export default OpponentBoard
