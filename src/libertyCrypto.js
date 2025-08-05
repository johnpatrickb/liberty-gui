import NativeWrapper from './nativeWrapper.js';
import axios from 'axios';

const MAX_INSTALLMENTS = 5000

let ledgerKey;
//let ledgerServerHostname = 'http://127.0.0.1:8080/'
let ledgerServerHostname = 'https://ledger.libertytreewatering.com/'
let enc = new TextEncoder()
let dec = new TextDecoder()

function normalizePem(unformatted, priv)
{
  let formatted

  if (priv === true)
    formatted = '-----BEGIN EC PRIVATE KEY-----\n'
  else
    formatted = '-----BEGIN PUBLIC KEY-----\n'

  for (let i = 0; i < unformatted.length; i += 64) {
    formatted += (unformatted.substr(i, 64) + '\n')
  }

  if (priv === true)
    formatted += '-----END EC PRIVATE KEY-----\n'
  else
    formatted += '-----END PUBLIC KEY-----\n'

  return formatted
}

function arrayBufferToBase64(buffer)
{
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64)
{
  // Decode the Base64 string into a binary string
  const binaryString = atob(base64);

  // Get the length of the binary string
  const length = binaryString.length;

  // Create a Uint8Array with the same length
  const bytes = new Uint8Array(length);

  // Populate the Uint8Array with byte values from the binary string
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Return the underlying ArrayBuffer
  return bytes.buffer;
}

function appendBuffer(buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

function arrayBufferToHex(arrayBuffer) {
  // Create a Uint8Array view of the ArrayBuffer
  const uint8Array = new Uint8Array(arrayBuffer);

  // Map each byte to its two-digit hexadecimal representation
  // and join them into a single string.
  return Array.from(uint8Array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function signRequest(request, nonce, privkey)
{
  let sigCheck

  if (nonce !== null) {
    sigCheck = appendBuffer(appendBuffer(enc.encode(JSON.stringify(request)).buffer, new ArrayBuffer(1)), base64ToArrayBuffer(nonce))
  }
  else {
    sigCheck = enc.encode(JSON.stringify(request)).buffer
  }

  privkey = privkey.substr('-----BEGIN EC PRIVATE KEY-----\n'.length)
  privkey = privkey.substr(0, privkey.length - '-----END EC PRIVATE KEY-----\n'.length)
  privkey = privkey.replace(/\n/g, '')
  privkey = base64ToArrayBuffer(privkey)
  privkey = await window.crypto.subtle.importKey('pkcs8', privkey, {name: 'ECDSA', namedCurve: 'P-521'}, false, ['sign'])
  let signature = await window.crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, privkey, sigCheck)

  return arrayBufferToBase64(signature)
}

async function consolidateStep(key)
{
  let splitOccurred = false
  let unfinished = []
  let request
  let response

  for (let receipt of key.receipts) {
    if (receipt.installments !== MAX_INSTALLMENTS)
      unfinished.push(receipt)
  }

  while (unfinished.length >= 2) {
    if (unfinished[0].installments + unfinished[1].installments > MAX_INSTALLMENTS) {
      request = {splits: [{id: unfinished[1].id, newOwnerPubkey: key.pubkey, splitInstallments: (unfinished[0].installments + unfinished[1].installments) % MAX_INSTALLMENTS}]}
      request.splits[0].ownerSignature = await signRequest(request.splits[0], unfinished[1].nonce, key.privkey)

      try {
        response = await axios.post(ledgerServerHostname + 'split', request)
      }
      catch (e) {
        console.log(e)
        return -1;
      }

      unfinished[1].nonce = response.data[0].nonce
      splitOccurred = true
    }

    request = {sourceId: unfinished[1].id, targetId: unfinished[0].id}
    let sourceSignature = await signRequest(request, unfinished[1].nonce, key.privkey)
    let targetSignature = await signRequest(request, unfinished[0].nonce, key.privkey)
    request.sourceSignature = sourceSignature
    request.targetSignature = targetSignature

    try {
      response = await axios.post(ledgerServerHostname + 'join', request)
    }
    catch (e) {
      console.log(e)
      return -1;
    }

    unfinished[0].installments = response.data.installments
    unfinished[0].nonce = response.data.nonce
    unfinished.splice(1, 1)

    if (unfinished[0].installments === MAX_INSTALLMENTS)
      unfinished.splice(0, 1)
  }

  return splitOccurred
}

export default {
  async decryptLedger(password)
  {
    let ledger = null
    let keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )
    ledgerKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new ArrayBuffer(0),
        iterations: 2048,
        hash: 'SHA-256',
      },
      keyMaterial,
      {name: 'AES-CBC', length: 256},
      true,
      ['encrypt', 'decrypt']
    )
    let cipherText = await NativeWrapper.getEncryptedLedger()

    if (cipherText === null) {
      ledger = enc.encode(JSON.stringify({keys: [], receipts: []}))
      cipherText = await window.crypto.subtle.encrypt({name: 'AES-CBC', iv: new ArrayBuffer(16)}, ledgerKey, ledger)
      cipherText = arrayBufferToBase64(cipherText)
      NativeWrapper.setEncryptedLedger(cipherText)
      return {keys: [], receipts: []}
    }
    else {
      try {
        cipherText = base64ToArrayBuffer(cipherText)
        let plainText = await window.crypto.subtle.decrypt({name: 'AES-CBC', iv: new ArrayBuffer(16)}, ledgerKey, cipherText)
        ledger = dec.decode(plainText)
        ledger = JSON.parse(ledger)
      }
      catch (e) {
        console.log(e)
        ledger = null
      }
    }

    return ledger
  },
  async syncLedger(keys)
  {
    if (keys.length === 0)
      return []

    let request = {ownerPubkeys: []}

    for (let key of keys) {
      let signedPubkey = {ownerPubkey: key.pubkey}
      signedPubkey.ownerSignature = await signRequest(signedPubkey, null, key.privkey)
      request.ownerPubkeys.push(signedPubkey)
    }

    let response

    try {
      response = await axios.post(ledgerServerHostname + 'read', request)
    }
    catch (e) {
      return null
    }

    return response.data
  },
  async generateKey()
  {
    let {publicKey, privateKey} = await window.crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-521'}, true, ['sign'])
    let privkey = await window.crypto.subtle.exportKey('pkcs8', privateKey)
    privkey = btoa(String.fromCharCode.apply(null, new Uint8Array(privkey)))
    privkey = normalizePem(privkey, true)
    let pubkey = await window.crypto.subtle.exportKey('spki', publicKey)
    pubkey = btoa(String.fromCharCode.apply(null, new Uint8Array(pubkey)))
    pubkey = normalizePem(pubkey, false)

    return {pubkey, privkey}
  },
  async saveLedger(keys, receipts)
  {
    let ledger = enc.encode(JSON.stringify({keys, receipts}))
    let cipherText = await window.crypto.subtle.encrypt({name: 'AES-CBC', iv: new ArrayBuffer(16)}, ledgerKey, ledger)
    cipherText = arrayBufferToBase64(cipherText)
    NativeWrapper.setEncryptedLedger(cipherText)
  },
  async transfer(keys, receipts, recipientKey, installments)
  {
    let workingInstallments = installments
    let request = {splits: []}

    for (let receipt of receipts) {
      if (receipt.redeemed !== true && receipt.ownerPubkey.trim() !== recipientKey.trim()) {
        for (let key of keys) {
          if (key.pubkey === receipt.ownerPubkey) {
            let split = {id: receipt.id, newOwnerPubkey: recipientKey}

            if (workingInstallments < receipt.installments) {
              split.splitInstallments = workingInstallments
            }
            else {
              split.splitInstallments = receipt.installments
            }

            split.ownerSignature = await signRequest(split, receipt.nonce, key.privkey)
            request.splits.push(split)
            workingInstallments -= split.splitInstallments
            break;
          }
        }
      }

      if (workingInstallments === 0)
        break;
    }

    if (workingInstallments !== 0)
      return false

    let response

    try {
      response = await axios.post(ledgerServerHostname + 'split', request)
    }
    catch (e) {
      console.log(e)
      return false
    }

    return true
  },
  async consolidate(key)
  {
    let splitOccurred = false

    do {
      splitOccurred = await consolidateStep(key)

      if (splitOccurred === -1)
        return false

      let receipts = await this.syncLedger([key])

      if (receipts === null)
        return false

      key.receipts = receipts
    } while (splitOccurred === true)

    return true
  },
  async redeem(key, receipt)
  {
    let response
    let request = {id: receipt.id}
    request.redemptionSignature = await signRequest(request, receipt.nonce, key.privkey)

    try {
      response = await axios.post(ledgerServerHostname + 'redeem', request)
    }
    catch (e) {
      console.log(e)
      return false
    }

    return true
  },
  async importKey(privkey)
  {
    let key = {}
    privkey = privkey.replace(/\r/g, '')
    privkey = privkey.replace(/\n/g, '')

    if (privkey.indexOf('-----BEGIN EC PRIVATE KEY-----') !== 0 || privkey.indexOf('-----END EC PRIVATE KEY-----') + '-----END EC PRIVATE KEY-----'.length !== privkey.length)
      return null

    privkey = privkey.substr('-----BEGIN EC PRIVATE KEY-----'.length)
    privkey = privkey.substr(0, privkey.length - '-----END EC PRIVATE KEY-----'.length)
    key.privkey = normalizePem(privkey, true)
    privkey = base64ToArrayBuffer(privkey)

    try {
      privkey = await window.crypto.subtle.importKey('pkcs8', privkey, {name: 'ECDSA', namedCurve: 'P-521'}, true, ['sign'])
    }
    catch (e) {
      console.log(e)
      return null
    }

    privkey = await window.crypto.subtle.exportKey('jwk', privkey)
    delete privkey.d
    privkey.key_ops = ['verify']
    let pubkey = await window.crypto.subtle.importKey('jwk', privkey, {name: 'ECDSA', namedCurve: 'P-521'}, true, ['verify'])
    pubkey = await window.crypto.subtle.exportKey('spki', pubkey)
    pubkey = btoa(String.fromCharCode.apply(null, new Uint8Array(pubkey)))
    key.pubkey = normalizePem(pubkey, false)

    return key
  },
  async fetchHistory(key)
  {
    let response
    let request = {pubkey: key.pubkey}
    request.historySignature = await signRequest(request, null, key.privkey)

    try {
      response = await axios.post(ledgerServerHostname + 'history', request)
    }
    catch(e) {
      console.log(e)
      return null
    }

    let privkey = key.privkey.substr('-----BEGIN EC PRIVATE KEY-----\n'.length)
    privkey = privkey.substr(0, privkey.length - '-----END EC PRIVATE KEY-----\n'.length)
    privkey = privkey.replace(/\n/g, '')
    privkey = base64ToArrayBuffer(privkey)
    privkey = await window.crypto.subtle.importKey('pkcs8', privkey, {name: 'ECDH', namedCurve: 'P-521'}, false, ['deriveBits'])
    let senderPubkey = response.data.pubkey.substr('-----BEGIN PUBLIC KEY-----\n'.length)
    senderPubkey = senderPubkey.substr(0, senderPubkey.length - '-----END PUBLIC KEY-----\n'.length)
    senderPubkey = senderPubkey.replace(/\n/g, '')
    senderPubkey = base64ToArrayBuffer(senderPubkey)
    senderPubkey = await window.crypto.subtle.importKey('spki', senderPubkey, {name: 'ECDH', namedCurve: 'P-521'}, false, [])
    let sharedSecretBits = await window.crypto.subtle.deriveBits({name: 'ECDH', public: senderPubkey}, privkey, 256)
    let symmetricKey = await window.crypto.subtle.importKey('raw', sharedSecretBits, {name: 'AES-CBC'}, false, ['decrypt'])
    let iv = base64ToArrayBuffer(response.data.iv)
    let plainText = await window.crypto.subtle.decrypt({name: 'AES-CBC', iv: iv}, symmetricKey, base64ToArrayBuffer(response.data.encryptedHistory))

    return JSON.parse(dec.decode(plainText))
  },
};
