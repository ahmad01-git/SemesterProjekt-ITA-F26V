import pool from './connect.js'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracks (
        id            SERIAL PRIMARY KEY,
        track_id      VARCHAR(50) UNIQUE,
        title         VARCHAR(255) NOT NULL,
        artist        VARCHAR(255) NOT NULL,
        genre         VARCHAR(100),
        duration_ms   INTEGER,
        popularity    INTEGER,
        danceability  DECIMAL(4,3),
        energy        DECIMAL(4,3),
        valence       DECIMAL(4,3),
        tempo         DECIMAL(6,3)
      )
    `)
    console.log('Tabeller oprettet!')
  } catch (error) {
    console.error('Fejl ved oprettelse af tabeller:', error)
  } finally {
    process.exit(0)
  }
}

createTables()