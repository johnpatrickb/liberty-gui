const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    let validChannels = ['getEncryptedLedger', 'setEncryptedLedger']

    if (validChannels.includes(channel))
      ipcRenderer.send(channel, data)
  },
  once: (channel, func) => {
    let validChannels = ['encryptedLedger']

    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => func(...args))
    }
  },
})
