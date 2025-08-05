import {CapacitorSQLite, SQLiteConnection} from '@capacitor-community/sqlite'
import {CapacitorBarcodeScanner, CapacitorBarcodeScannerAndroidScanningLibrary, CapacitorBarcodeScannerCameraDirection, CapacitorBarcodeScannerScanOrientation, CapacitorBarcodeScannerTypeHint} from '@capacitor/barcode-scanner';

const SQLITE_USER = 'liberty'

let sqlite = new SQLiteConnection(CapacitorSQLite)
let db = null

const SCHEMA = `CREATE TABLE IF NOT EXISTS localLedger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ledger TEXT NOT NULL
);`

export default {
  async getEncryptedLedger()
  {
    if (db === null) {
      db = await sqlite.createConnection(SQLITE_USER, false, 'no-encryption', 1, false)
      await db.open()
      await db.execute(SCHEMA)
    }

    let ledger = await db.query('SELECT * FROM localLedger;')

    if (!ledger || ledger.values.length === 0)
      return null

    return ledger.values[0].ledger
  },
  async setEncryptedLedger(encryptedLedger)
  {
    let result

    if (await this.getEncryptedLedger() === null)
      await db.query(`INSERT INTO localLedger (ledger) VALUES('${encryptedLedger}');`)
    else
      await db.query(`UPDATE localLedger SET ledger='${encryptedLedger}';`)
  },
  async scanQRCode()
  {
    let scanRet

    try {
      scanRet = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Please Scan a Liberty Receipt Manager QR Code',
        scanButton: false,
        scanText: 'Scan',
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
        android: {
          scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.ZXING,
        },
      })
    }
    catch(e) {
      console.log(e)
      return null
    }

    if (scanRet.ScanResult.indexOf('-----BEGIN PUBLIC KEY-----') === 0) {
      if (scanRet.ScanResult.indexOf(':') === -1)
        return {type: 'public', key: scanRet.ScanResult}
      else if (scanRet.ScanResult.split(':').length !== 2)
        return {type: 'unrecognized'}
      else if (Number.isNaN(parseInt(scanRet.ScanResult.split(':')[1])))
        return {type: 'unrecognized'}

      return {type: 'request', key: scanRet.ScanResult.split(':')[0], installments: parseInt(scanRet.ScanResult.split(':')[1])}
    }
    else if (scanRet.ScanResult.indexOf('-----BEGIN EC PRIVATE KEY-----') === 0) {
      return {type: 'private', key: scanRet.ScanResult}
    }
    else {
      return {type: 'unrecognized'}
    }
  },
};
