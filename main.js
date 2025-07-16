const {app, BrowserWindow, ipcMain} = require('electron')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const tls = require('tls')


const MAX_INSTALLMENTS = 5000

let win;
let storedPassword;

const tlsOptions = {
  ca: [fs.readFileSync(path.join(app.getAppPath(), 'ca-cert.pem'))]
}

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

const normalizePubkey = (pubkey) => {
  let key = crypto.createPublicKey(pubkey)
  return key.export({type: 'spki', format: 'pem'}).toString()
}

const signRequest = (request, nonce, privkey) => {
  try {
    let sigCheck

    if (nonce != null) {
      sigCheck = Buffer.concat([Buffer.from(JSON.stringify(request)), Buffer.from('\0'), Buffer.from(nonce, 'base64')])
    }
    else {
      sigCheck = Buffer.from(JSON.stringify(request))
    }

    let key = crypto.createPrivateKey({key: privkey, format: 'pem', type: 'pkcs8'})
    let signer = crypto.createSign('sha256')
    signer.update(sigCheck)
    let sig = signer.sign(key, 'base64')
    return sig
  }
  catch (e) {
    return null
  }
}

/*
const syncLedger = async (keys) => {
  let receipts = {}

  let promises = keys.map((key) => {
    return new Promise((resolve, reject) => {
      let response = ''
      let socket = tls.connect(8080, '127.0.0.1', tlsOptions, () => {
        let request = {type: 'read', ownerPubkey: key.pubkey}
        request.ownerSignature = signRequest(request, null, key.privkey)
        socket.write(JSON.stringify(request))
      })
      socket.setEncoding('utf8')
      socket.on('data', (data) => {
        response += data
      })
      socket.on('end', () => {
        let responseJson = JSON.parse(response)
        for (let i in responseJson) {
          responseJson[i].pubkey = key.pubkey
        }
        resolve(responseJson)
      })
    })
  })

  let receiptArrays = await Promise.all(promises)

  for (let receiptArray of receiptArrays) {
    for (let receipt of receiptArray) {
      receipts[receipt.id] = receipt
    }
  }

  return {keys, receipts}
}
*/

const syncLedger = async (keys) => {
  let receipts = {}
  let request = {type: 'read', ownerPubkeys: []}

  if (keys.length === 0)
    return {keys, receipts}

  for (let key of keys) {
    let signedPubkey = {ownerPubkey: key.pubkey}
    signedPubkey.ownerSignature = signRequest(signedPubkey, null, key.privkey)
    request.ownerPubkeys.push(signedPubkey)
  }

  let response = ''

  let receiptArray = await new Promise((resolve, reject) => {
    let socket = tls.connect(8080, '127.0.0.1', tlsOptions, () => {
      socket.write(JSON.stringify(request))
    })
    socket.setEncoding('utf8')
    socket.on('data', (data) => {
      response += data
    })
    socket.on('end', () => {
      if (response === 'ERROR')
        reject('Failed to split')
      else
        resolve(JSON.parse(response))
    })
  })

  for (let receipt of receiptArray) {
    receipts[receipt.id] = receipt
  }

  return {keys, receipts}
}

const consolidateKey = async (key) => {
  let splitOccurred = false
  let unfinished = []

  for (let receipt of key.receipts) {
    if (receipt.installments !== MAX_INSTALLMENTS)
      unfinished.push(receipt)
  }

  while (unfinished.length >= 2) {
    if (unfinished[0].installments + unfinished[1].installments > MAX_INSTALLMENTS) {
      let split = {ledgerId: unfinished[1].id, newOwnerPubkey: key.pubkey, splitInstallments: (unfinished[0].installments + unfinished[1].installments) % MAX_INSTALLMENTS}
      split.ownerSignature = signRequest(split, unfinished[1].nonce, key.privkey)
      let splitRequestJson = {type: 'split', splits: [split]}

      let splitResponseJson
      try {
        splitResponseJson = await new Promise((resolve, reject) => {
          let response = ''
          let socket = tls.connect(8080, '127.0.0.1', tlsOptions, () => {
            socket.write(JSON.stringify(splitRequestJson))
          })
          socket.setEncoding('utf8')
          socket.on('data', (data) => {
            response += data
          })
          socket.on('end', () => {
            if (response === 'ERROR')
              reject('Failed to split')
            else
              resolve(JSON.parse(response))
          })
        })

        unfinished[1].nonce = splitResponseJson.nonce
        splitOccurred = true
      }
      catch (e) {
        console.log(e)
        return -1
      }
    }

    let joinRequestJson = {type: 'join', sourceLedgerId: unfinished[1].id, targetLedgerId: unfinished[0].id}
    let sourceSig = signRequest(joinRequestJson, unfinished[1].nonce, key.privkey)
    let targetSig = signRequest(joinRequestJson, unfinished[0].nonce, key.privkey)
    joinRequestJson.sourceOwnerSignature = sourceSig
    joinRequestJson.targetOwnerSignature = targetSig

    let joinResponseJson
    try {
      joinResponseJson = await new Promise((resolve, reject) => {
        let response = ''
        let socket = tls.connect(8080, '127.0.0.1', tlsOptions, () => {
          socket.write(JSON.stringify(joinRequestJson))
        })
        socket.setEncoding('utf8')
        socket.on('data', (data) => {
          response += data
        })
        socket.on('end', () => {
          if (response === 'ERROR')
            reject('Failed to join')
          else
            resolve(JSON.parse(response))
        })
      })

      unfinished[0].installments = joinResponseJson.installments
      unfinished[0].nonce = joinResponseJson.nonce
      unfinished.splice(1, 1)

      if (unfinished[0].installments === MAX_INSTALLMENTS)
        unfinished.splice(0, 1)
    }
    catch (e) {
      console.log(e)
      return -1
    }
  }

  return splitOccurred
}

ipcMain.on('decryptLedger',  (event, password) => {
  if (password === null) {
    if (fs.existsSync(path.join(app.getAppPath(), '.localLedger'))) {
      win.webContents.send('decryptedLedger', 'found')
    }
    return;
  }

  storedPassword = password

  let ledgerJson;
  const key = crypto.pbkdf2Sync(password, '', 2048, 32, 'sha256')

  if (fs.existsSync(path.join(app.getAppPath(), '.localLedger'))) {
    fs.readFile(path.join(app.getAppPath(), '.localLedger'), (err, ledger) => {
      if (err) {
        win.webContents.send('decryptedLedger', null)
        return;
      }

      let decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16))
      decipher.setAutoPadding(false)
      let decrypted = decipher.update(ledger, null, 'utf8')
      decrypted += decipher.final('utf8')

      // remove the padding
      for (let i = decrypted.length - 1; i > 0; i--) {
        if (decrypted[i] === '}') {
          decrypted = decrypted.substr(0, i + 1)
          break
        }
      }

      try {
        ledgerJson = JSON.parse(JSON.stringify(decrypted))

        // try without stringify if it returned a string
        if (typeof ledgerJson === 'string')
          ledgerJson = JSON.parse(decrypted)

        win.webContents.send('decryptedLedger', ledgerJson)
      }
      catch (e) {
        console.log(e)
        win.webContents.send('decryptedLedger', null)
      }
    })
  }
  else {
    let ledger = {keys:[], receipts: {}}

    let cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16))
    let encrypted = cipher.update(JSON.stringify(ledger), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    encrypted = Buffer.from(encrypted, 'hex')

    fs.writeFileSync(path.join(app.getAppPath(), '.localLedger'), encrypted, 'hex')

    win.webContents.send('decryptedLedger', ledger)
  }
})

ipcMain.on('syncLedger',  (event, keys) => {
  syncLedger(keys).then((ledger) => {
    win.webContents.send('decryptedLedger', ledger)
  })
})

ipcMain.on('generateKey',  (event, data) => {
  let { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp521r1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  }); 

  let key = {pubkey: publicKey, privkey: privateKey, name: data.name} 
  data.keys.push(key)
  let ledger = {keys: data.keys, receipts: data.receipts}

  const aesKey = crypto.pbkdf2Sync(storedPassword, '', 2048, 32, 'sha256')

  let cipher = crypto.createCipheriv('aes-256-cbc', aesKey, Buffer.alloc(16))
  let encrypted = cipher.update(JSON.stringify(ledger), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  encrypted = Buffer.from(encrypted, 'hex')

  fs.writeFileSync(path.join(app.getAppPath(), '.tmpLocalLedger'), encrypted, 'hex')

  fs.renameSync(path.join(app.getAppPath(), '.tmpLocalLedger'), path.join(app.getAppPath(), '.localLedger'))
  win.webContents.send('decryptedLedger', ledger)
})

ipcMain.on('transfer', (event, data) => {
  let request = {type: 'split', splits: []}
  let installments = data.installments

  for (let index in data.receipts) {
    if (data.receipts[index].pubkey.trim() !== data.recipientKey.trim() && data.receipts[index].redeemed !== true) {
      for (let key of data.keys) {
        if (key.pubkey === data.receipts[index].pubkey) {
          let split = {ledgerId: data.receipts[index].id, newOwnerPubkey: normalizePubkey(data.recipientKey)}

          if (installments < data.receipts[index].installments) {
            split.splitInstallments = installments
          }
          else {
            split.splitInstallments = data.receipts[index].installments
          }

          split.ownerSignature = signRequest(split, data.receipts[index].nonce, key.privkey)
          request.splits.push(split)
          installments -= split.splitInstallments;
          break;
        }
      }
    }

    if (installments === 0)
      break;
  }

  if (installments != 0)
    return

  let response = ''
  let socket = tls.connect(8080, '127.0.0.1', tlsOptions, () => {
    socket.write(JSON.stringify(request))
  })
  socket.setEncoding('utf8')
  socket.on('data', (data) => {
    response += data
  })
  socket.on('end', () => {
    if (response === 'ERROR')
      console.log('Failed to transfer')
    else {
      syncLedger(data.keys).then((ledger) => {
        win.webContents.send('decryptedLedger', ledger)
      })
    }
  })
})

ipcMain.on('consolidate', async (event, data) => {
  let splitOccurred = false
  let key = data.key
  let ledger

  do {
    splitOccurred = await consolidateKey(key)

    if (splitOccurred === -1) {
      console.log('consolidateKey Failed')
      return
    }

    ledger = await syncLedger(data.keys)
    key.receipts = []

    for (let id in ledger.receipts) {
      if (ledger.receipts[id].pubkey === key.pubkey) {
        key.receipts.push(ledger.receipts[id])
      }
    }
  } while (splitOccurred === true)

  win.webContents.send('decryptedLedger', ledger)
})

ipcMain.on('redeem', (event, data) => {
  let request = {type: 'redeem', id: data.receipt.id}
  request.redemptionSignature = signRequest(request, data.receipt.nonce, data.key.privkey)
  let response = ''
  let socket = tls.connect(8080, '127.0.0.1', tlsOptions, () => {
    socket.write(JSON.stringify(request))
  })
  socket.setEncoding('utf8')
  socket.on('data', (data) => {
    response += data
  })
  socket.on('end', () => {
    if (response === 'ERROR')
      console.log('Failed to redeem')
    else {
      syncLedger(data.keys).then((ledger) => {
        win.webContents.send('decryptedLedger', ledger)
      })
    }
  })
})
