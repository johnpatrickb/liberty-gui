import {CapacitorSQLite, SQLiteConnection} from '@capacitor-community/sqlite'

const SQLITE_USER = 'liberty'

let sqlite = new SQLiteConnection(CapacitorSQLite)
let db = null

const SCHEMA = `CREATE TABLE IF NOT EXISTS localLedger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ledger TEXT NOT NULL
);`

export default {
  async getEncryptedLedger() {
    if (db === null) {
      db = await sqlite.createConnection(SQLITE_USER, false, 'no-encryption', 1, false)
      await db.open()
      await db.execute(SCHEMA)
    }

    let ledger = await db.query('SELECT * FROM localLedger;')

    console.log('getEncryptedLedger',JSON.stringify(ledger))

    if (!ledger || ledger.values.length === 0)
      return null

    return ledger.values[0].ledger
  },
  async setEncryptedLedger(encryptedLedger) {
    let result
    console.log('setEncryptedLedger', encryptedLedger)
    if (await this.getEncryptedLedger() === null)
      result = await db.query(`INSERT INTO localLedger (ledger) VALUES('${encryptedLedger}');`)
    else
      result = await db.query(`UPDATE localLedger SET ledger='${encryptedLedger}';`)

    console.log('setEncryptedLedger', JSON.stringify(result))
  },
};
