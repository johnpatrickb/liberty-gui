export default {
  getEncryptedLedger() {
    return new Promise((resolve, reject) => {
      window.api.once('encryptedLedger', (encryptedLedger) => {
        resolve(encryptedLedger)
      })
      window.api.send('getEncryptedLedger')
    })
  },
  setEncryptedLedger(encryptedLedger) {
    window.api.send('setEncryptedLedger', encryptedLedger)
  },
  getCurVersion() {
    return new Promise((resolve, reject) => {
      window.api.once('curVersion', (version) => {
        resolve(version)
      })
      window.api.send('getCurVersion')
    })
  },
  getNewVersion() {
    return new Promise((resolve, reject) => {
      window.api.receive('newVersion', (version) => {
        resolve(version)
      })
      window.api.send('getNewVersion')
    })
  },
  restart() {
    window.api.send('restart')
  },
};
