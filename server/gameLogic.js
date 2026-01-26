const BOARD_SIZE = 10
const SHIPS = [5, 4, 3, 3, 2]

const buildEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      row,
      col,
      status: 'empty',
      shipIndex: null
    }))
  )

const generateShipCoords = (length) => {
  const isHorizontal = Math.random() < 0.5
  const maxRow = isHorizontal ? BOARD_SIZE - 1 : BOARD_SIZE - length
  const maxCol = isHorizontal ? BOARD_SIZE - length : BOARD_SIZE - 1
  const startRow = Math.floor(Math.random() * (maxRow + 1))
  const startCol = Math.floor(Math.random() * (maxCol + 1))

  return Array.from({ length }, (_, i) =>
    isHorizontal
      ? { row: startRow, col: startCol + i }
      : { row: startRow + i, col: startCol }
  )
}

const hasOverlap = (coords, occupied) => {
  return coords.some(({ row, col }) => occupied.has(`${row}-${col}`))
}

const buildBoardWithShips = () => {
  const board = buildEmptyBoard()
  const occupied = new Set()
  const ships = []

  SHIPS.forEach((shipLength, shipIndex) => {
    let coords
    let attempts = 0
    do {
      coords = generateShipCoords(shipLength)
      attempts++
    } while (hasOverlap(coords, occupied) && attempts < 100)

    const shipCells = []
    coords.forEach(({ row, col }) => {
      occupied.add(`${row}-${col}`)
      board[row][col].status = 'ship'
      board[row][col].shipIndex = shipIndex
      shipCells.push({ row, col })
    })

    ships.push({
      index: shipIndex,
      length: shipLength,
      hits: 0,
      sunk: false,
      cells: shipCells
    })
  })

  return { board, ships }
}

const processAttack = (board, ships, row, col) => {
  const cell = board[row][col]

  if (cell.status === 'hit' || cell.status === 'miss' || cell.status === 'sunk') {
    return { error: 'already-attacked' }
  }

  if (cell.status === 'ship') {
    cell.status = 'hit'
    const ship = ships[cell.shipIndex]
    ship.hits++

    const sunk = ship.hits === ship.length
    let sunkCells = null

    if (sunk) {
      ship.sunk = true
      sunkCells = []
      // Mark all ship cells as sunk
      ship.cells.forEach(({ row: r, col: c }) => {
        board[r][c].status = 'sunk'
        sunkCells.push({ row: r, col: c })
      })
    }

    return {
      hit: true,
      sunk,
      shipIndex: cell.shipIndex,
      sunkCells
    }
  }

  cell.status = 'miss'
  return { hit: false, sunk: false }
}

const checkWinner = (ships) => {
  return ships.every(ship => ship.sunk)
}

module.exports = {
  BOARD_SIZE,
  SHIPS,
  buildEmptyBoard,
  buildBoardWithShips,
  processAttack,
  checkWinner
}
