import {app, BrowserWindow, ipcMain} from 'electron'
import Store from 'electron-store'
import fs from 'fs'
import {fileURLToPath} from 'url'
import path from 'path'
import crypto from 'crypto'
import tls from 'tls'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MAX_INSTALLMENTS = 5000

let win
let storedPassword

const tlsOptions = {
  ca: [fs.readFileSync(path.join(app.getAppPath(), 'ca-cert.pem'))]
}

const store = new Store()
//store.delete('ledger')

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });
  win.loadURL('http://localhost:8000');
  //win.loadFile('dist/index.html');
  win.webContents.openDevTools();
});

ipcMain.on('getEncryptedLedger', (event) => {
  let ledger = null
  if (store.has('ledger')) {
    ledger = store.get('ledger')
  }
  win.webContents.send('encryptedLedger', ledger)
})

ipcMain.on('setEncryptedLedger', (event, encryptedLedger) => {
  store.set('ledger', encryptedLedger)
})
