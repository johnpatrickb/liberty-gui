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
};
