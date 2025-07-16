const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    let validChannels = ['decryptLedger', 'syncLedger', 'generateKey', 'transfer', 'consolidate', 'redeem']

    if (validChannels.includes(channel))
      ipcRenderer.send(channel, data)
  },
  receive: (channel, func) => {
    let validChannels = ['ledgerFound', 'decryptedLedger']

    if (validChannels.includes(channel))
      ipcRenderer.on(channel, (event, ...args) => func(...args))
  }
})
