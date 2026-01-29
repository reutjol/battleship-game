import { PiCrosshairFill } from "react-icons/pi"
import { SiFireship } from "react-icons/si"
import { FaSkull } from "react-icons/fa6"

const Board = ({
  title,
  cells,
  onCellClick,
  getCellClassName,
  className = '',
}) => {
  const columns = cells?.[0]?.length || 0

  const renderCellIcon = (cell) => {
    if (cell.status === 'sunk') {
      return <FaSkull className="cell-icon cell-skull" />
    }
    if (cell.status === 'hit') {
      return <SiFireship className="cell-icon cell-fire" />
    }
    if (cell.status === 'miss') {
      return <span className="cell-miss-dot" />
    }
    return null
  }

  return (
    <div className={`board ${className}`.trim()}>
      <div className="board-header">{title}</div>
      <div
        className="board-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(30px, 1fr))` }}
      >
        {cells?.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const extraClass = getCellClassName ? getCellClassName(cell) : ''
            return (
              <button
                key={cell.id ?? `${rIdx}-${cIdx}`}
                className={`board-cell ${extraClass}`.trim()}
                onClick={() => onCellClick?.(cell)}
                aria-label={`cell-${cell.row}-${cell.col}`}
              >
                <PiCrosshairFill className="cell-crosshair" aria-hidden="true" />
                {renderCellIcon(cell)}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

export default Board
