import {app, BrowserWindow, ipcMain, Menu} from 'electron'
import electronUpdater from 'electron-updater'
import Store from 'electron-store'
import {fileURLToPath} from 'url'
import path from 'path'

const autoUpdater = electronUpdater.autoUpdater

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MAX_INSTALLMENTS = 5000

let win
let updateVersion = null
let updateInterval

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
  win.loadURL('http://localhost:8000')
  //win.loadFile('dist/index.html')
  win.webContents.openDevTools()
  Menu.setApplicationMenu(null)
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

ipcMain.on('getCurVersion', (event) => {
  win.webContents.send('curVersion', app.getVersion())
})

ipcMain.on('getNewVersion', (event) => {
  autoUpdater.checkForUpdates()
  updateInterval = setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 1000 * 60 * 60 * 3)
})

autoUpdater.on('update-available', (info) => {
  updateVersion = info.version
  clearInterval(updateInterval)
})

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  win.webContents.send('newVersion', updateVersion)
})

ipcMain.on('restart', (event) => {
  autoUpdater.quitAndInstall()
})
