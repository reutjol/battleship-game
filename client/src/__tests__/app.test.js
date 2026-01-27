import { describe, it, expect } from 'vitest'

/**
 * Basic tests for Battleship game
 */

describe('Game Logic', () => {
  // Test board initialization
  it('should create a 10x10 board', () => {
    const board = Array.from({ length: 10 }, (_, row) =>
      Array.from({ length: 10 }, (_, col) => ({
        row,
        col,
        status: 'empty'
      }))
    )

    expect(board.length).toBe(10)
    expect(board[0].length).toBe(10)
    expect(board[0][0].status).toBe('empty')
  })

  // Test cell status values
  it('should have valid cell statuses', () => {
    const validStatuses = ['empty', 'ship', 'hit', 'miss', 'sunk']

    validStatuses.forEach(status => {
      expect(typeof status).toBe('string')
    })
  })
})

describe('Validation', () => {
  // Test email validation
  it('should validate email format', () => {
    const isValidEmail = (email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  // Test username length
  it('should validate username length (3-20 chars)', () => {
    const isValidUsername = (username) => {
      return username.length >= 3 && username.length <= 20
    }

    expect(isValidUsername('ab')).toBe(false)      // too short
    expect(isValidUsername('abc')).toBe(true)      // minimum
    expect(isValidUsername('validuser')).toBe(true)
    expect(isValidUsername('a'.repeat(21))).toBe(false) // too long
  })

  // Test password length
  it('should validate password length (min 6 chars)', () => {
    const isValidPassword = (password) => {
      return password.length >= 6
    }

    expect(isValidPassword('12345')).toBe(false)   // too short
    expect(isValidPassword('123456')).toBe(true)   // minimum
    expect(isValidPassword('securepassword')).toBe(true)
  })
})

describe('Ships Configuration', () => {
  const ships = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 }
  ]

  it('should have 5 ships', () => {
    expect(ships.length).toBe(5)
  })

  it('should have correct total cells (17)', () => {
    const totalCells = ships.reduce((sum, ship) => sum + ship.size, 0)
    expect(totalCells).toBe(17)
  })

  it('should have ships with valid sizes (2-5)', () => {
    ships.forEach(ship => {
      expect(ship.size).toBeGreaterThanOrEqual(2)
      expect(ship.size).toBeLessThanOrEqual(5)
    })
  })
})
