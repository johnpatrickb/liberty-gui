<script setup>
import {isProxy, toRaw} from 'vue';
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'
import Init from './components/Init.vue'
import Ledger from './components/Ledger.vue'
import NewKey from './components/NewKey.vue'
import Transfer from './components/Transfer.vue'
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
      page: 'ledger',
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
          console.log('Failed to sync ledger')
          return
        }

        this.receipts = receipts
        this.autoSync = setInterval(async () => {
          if (this.loading === false && this.ledgerDecrypted === true) {
            let receipts = await LibertyCrypto.syncLedger(this.keys)

            if (receipts === null) {
              console.log('Failed to sync ledger')
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
    changePage(page) {
      this.page = page
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
        console.log('Failed to transfer')
        return
      }

      let receipts = await LibertyCrypto.syncLedger(this.keys)

      if (receipts === null) {
        console.log('Failed to sync ledger')
        return
      }

      this.receipts = receipts
      this.loading = false
    },
    async consolidate(key) {
      this.loading = true
      let consolidated = await LibertyCrypto.consolidate(key)

      if (consolidated === false) {
        console.log('Failed to consolidate receipts')
        return
      }

      let receipts = await LibertyCrypto.syncLedger(this.keys)

      if (receipts === null) {
        console.log('Failed to sync ledger')
        return
      }

      this.receipts = receipts
      this.loading = false
    },
    async redeem(data) {
      this.loading = true
      let redeemed = await LibertyCrypto.redeem(data.key, data.receipt)

      if (redeemed === false) {
        console.log('Failed to redeem receipt')
        return
      }

      let receipts = await LibertyCrypto.syncLedger(this.keys)

      if (receipts === null) {
        console.log('Failed to sync ledger')
        return
      }

      this.receipts = receipts
      this.loading = false
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
  <Header />
  <div class="flex-container">
    <Sidebar @change="changePage" :denarii-total="denariiTotal" :active-page="page" class="sidebar" />
    <Ledger v-show="page === 'ledger'" @consolidate="consolidate" @redeem="redeem" :keys="keys" :receipts="receipts" class="content" />
    <NewKey v-show="page === 'newKey'" @newKey="generateKey" class="content" />
    <Transfer v-show="page === 'transfer'" @transfer="transfer" :denarii-total="denariiTotal" class="content" />
  </div>
</template>

<style>
body {
  margin: 0;
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
}

.flex-container {
  display: flex;
  width: 100%;
}
</style>
