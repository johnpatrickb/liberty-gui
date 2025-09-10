const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    let validChannels = ['getEncryptedLedger', 'setEncryptedLedger', 'getCurVersion', 'getNewVersion', 'restart']

    if (validChannels.includes(channel))
      ipcRenderer.send(channel, data)
  },
  receive: (channel, func) => {
    let validChannels = ['newVersion']

    if (validChannels.includes(channel))
      ipcRenderer.on(channel, (event, value) => func(value))
  },
  once: (channel, func) => {
    let validChannels = ['encryptedLedger', 'curVersion']

    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => func(...args))
    }
  },
})
