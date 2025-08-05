<script setup>
import {isProxy, toRaw} from 'vue';
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'
import Init from './components/Init.vue'
import Ledger from './components/Ledger.vue'
import NewKey from './components/NewKey.vue'
import Transfer from './components/Transfer.vue'
import Request from './components/Request.vue'
import ImportKey from './components/ImportKey.vue'
import Error from './components/Error.vue'
import LibertyCrypto from './libertyCrypto.js'
import NativeWrapper from './nativeWrapper.js';
</script>

<script>
export default {
  data () {
    NativeWrapper.getEncryptedLedger().then((encryptedLedger) => {
      if (encryptedLedger !== null)
        this.ledgerFound = true
    })
    return {
      keys: [],
      receipts: [],
      ledgerFound: false,
      ledgerDecrypted: false,
      badPassword: false,
      loading: false,
      autoSync: null,
      checkLedgerDiff: false,
      page: this.isMobile() ? '' : 'ledger',
      mobileShowMenu: true,
      requestStatus: '',
      requestReceived: null,
      requestPubkey: '',
      errorText: '',
      history: null,
    }
  },
  methods: {
    async decryptLedger(password) {
      this.loading = true
      let ledger = await LibertyCrypto.decryptLedger(password)

      if (ledger === null) {
        this.badPassword = true
      }
      else {
        this.keys = ledger.keys
        this.ledgerDecrypted = true
        let receipts = await LibertyCrypto.syncLedger(this.keys)

        if (receipts === null) {
          this.errorText = 'Failed to sync ledger, check your internet connection'
          this.loading = false
          return
        }

        this.receipts = receipts
        this.autoSync = setInterval(async () => {
          if (this.loading === false && this.ledgerDecrypted === true) {
            let receipts = await LibertyCrypto.syncLedger(this.keys)

            if (receipts === null) {
              this.errorText = 'Failed to sync ledger, check your internet connection.'
              return
            }

            if (JSON.stringify(toRaw(this.receipts)) != JSON.stringify(receipts)) {
              this.loading = true
              setTimeout(() => {this.loading = false}, 400)
            }

            this.receipts = receipts
          }
        }, 1000 * 10)
      }
      this.loading = false
    },
    async generateKey(name) {
      this.loading = true
      this.page = 'ledger'
      let key = await LibertyCrypto.generateKey()
      key.name = name
      this.keys.push(key)
      await LibertyCrypto.saveLedger(this.keys, this.receipts)
      this.loading = false
    },
    async transfer(data) {
      this.loading = true
      this.page = 'ledger'
      let transfered = await LibertyCrypto.transfer(this.keys, this.receipts, data.recipientKey, data.installments)

      if (transfered === false) {
        this.errorText = 'Failed to transfer receipts, check the recipient public key and your internet connection.'
        this.loading = false
        return
      }

      let receipts = await LibertyCrypto.syncLedger(this.keys)

      if (receipts === null) {
        this.errorText = 'Failed to sync ledger, check your internet connection.'
        this.loading = false
        return
      }

      this.receipts = receipts
      this.loading = false
    },
    async consolidate(key) {
      this.loading = true
      let consolidated = await LibertyCrypto.consolidate(key)

      if (consolidated === false) {
        this.errorText = 'Failed to consolidate receipts, check your internet connection.'
        this.loading = false
        return
      }

      let receipts = await LibertyCrypto.syncLedger(this.keys)

      if (receipts === null) {
        this.errorText = 'Failed to sync ledger, check your internet connection.'
        this.loading = false
        return
      }

      this.receipts = receipts
      this.loading = false
    },
    async redeem(data) {
      this.loading = true
      let redeemed = await LibertyCrypto.redeem(data.key, data.receipt)

      if (redeemed === false) {
        this.errorText = 'Failed to redeem receipt, check your internet connection.'
        this.loading = false
        return
      }

      let receipts = await LibertyCrypto.syncLedger(this.keys)

      if (receipts === null) {
        this.errorText = 'Failed to sync ledger, check your internet connection.'
        this.loading = false
        return
      }

      this.receipts = receipts
      this.loading = false
    },
    async request(data) {
      this.loading = true
      let key = await LibertyCrypto.generateKey()
      key.name = data.name
      this.keys.push(key)
      await LibertyCrypto.saveLedger(this.keys, this.receipts)
      this.requestStatus = 'pending'
      this.loading = false
      this.requestPubkey = key.pubkey

      while (this.requestStatus === 'pending') {
        await new Promise((resolve) => {setTimeout(() => {resolve()}, 3000)})
        let receipts = await LibertyCrypto.syncLedger([key])

        if (receipts.length === 0) {
          continue
        }

        let denariiTotal = 0

        for (let receipt of receipts) {
          denariiTotal += receipt.installments
        }

        this.requestReceived = denariiTotal

        if (denariiTotal === data.installments)
          this.requestStatus = 'success'
        else
          this.requestStatus = 'insufficient'
      }
    },
    async importKey(data) {
      this.loading = true
      this.page = 'ledger'
      let key = await LibertyCrypto.importKey(data.privkey)

      if (key === null) {
        this.errorText = 'Failed to import private key, ensure that the key is in proper pem format.'
        this.loading = false
        return
      }

      key.name = data.name
      this.keys.push(key)
      await LibertyCrypto.saveLedger(this.keys, this.receipts)
      let receipts = await LibertyCrypto.syncLedger(this.keys)

      if (receipts === null) {
        this.errorText = 'Failed to sync ledger, check your internet connection.'
        this.loading = false
        return
      }

      this.receipts = receipts
      this.loading = false
    },
    async removeKey(privkey) {
      this.loading = true

      for (let i in this.keys) {
        if (this.keys[i].privkey === privkey) {
          this.keys.splice(i, 1)
          break
        }
      }

      await LibertyCrypto.saveLedger(this.keys, this.receipts)

      let receipts = await LibertyCrypto.syncLedger(this.keys)

      if (receipts === null) {
        this.errorText = 'Failed to sync ledger, check your internet connection.'
        this.loading = false
        return
      }

      this.receipts = receipts
      this.loading = false
    },
    async fetchHistory(key) {
      this.loading = true
      this.history = null
      let history = await LibertyCrypto.fetchHistory(key)

      if (history === null) {
        this.errorText = 'Failed to fetch key history, check your internet connection.'
        this.loading = false
        return
      }

      this.history = history
      this.loading = false
    },
    changePage(page) {
      this.history = null
      this.requestStatus = ''
      this.requestReceived = null
      this.requestPubkey = ''
      this.mobileShowMenu = !this.mobileShowMenu
      this.page = page
    },
    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    },
  },
  computed: {
    denariiTotal() {
      let total = 0

      for (let receipt of this.receipts) {
        if (receipt.redeemed !== true)
          total += receipt.installments
      }

      return total
    }
  }
}
</script>

<template>
  <div class="loading" v-show="loading">loading...</div>
  <Init v-show="!loading" v-if="!ledgerDecrypted" @decrypt="decryptLedger" :ledger-found="ledgerFound" :bad-password="badPassword" />
  <Error @clearError="errorText = ''" :errorText="errorText" />
  <Header v-show="page !== ''" @back="changePage('')" />
  <div class="flex-container">
    <Sidebar v-show="(mobileShowMenu && ledgerDecrypted) || !isMobile()" @change="changePage" :denarii-total="denariiTotal" :active-page="page" class="sidebar" />
    <Ledger v-show="page === 'ledger'" @consolidate="consolidate" @redeem="redeem" @remove="removeKey" @fetchHistory="fetchHistory" :keys="keys" :receipts="receipts" :history="history" :mobile="isMobile()" class="content" />
    <NewKey v-show="page === 'newKey'" @newKey="generateKey" class="content" />
    <Transfer v-show="page === 'transfer'" @transfer="transfer" :denarii-total="denariiTotal" class="content" />
    <Request v-show="page === 'request'" @request="request" :status="requestStatus" :received="requestReceived" :pubkey="requestPubkey" :mobile="isMobile()" class="content" />
    <ImportKey v-show="page === 'import'" @importKey="importKey" class="content" />
  </div>
</template>

<style>
body {
  margin: 0;
}

.key {
  white-space: pre;
  overflow: auto;
}

.modal-background {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: grey;
  z-index: 2;
}

.modal-body {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 10px;
  z-index: 2;
}

@media only screen and (max-width: 480px) {
  .modal-body {
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    transform: none;
    text-align: center;
  }

  .modal-body h1 {
    font-size: 1.5em;
    padding-top: 30px;
  }

  .modal-body input {
    margin-top: 5px;
  }
}
</style>

<style scoped>
.loading {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: grey;
}

.sidebar {
  width: 180px;
  padding: 0 20px;
}

.content {
  flex: 1;
  vertical-align: top;
  overflow: hidden;
}

.flex-container {
  display: flex;
  width: 100%;
}

@media only screen and (max-width: 480px) {
  .sidebar {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    width: initial;
    background-color: white;
  }
}
</style>
