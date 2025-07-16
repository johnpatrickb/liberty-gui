<script setup>
import {isProxy, toRaw} from 'vue';
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'
import Init from './components/Init.vue'
import Ledger from './components/Ledger.vue'
import NewKey from './components/NewKey.vue'
import Transfer from './components/Transfer.vue'
</script>

<script>
export default {
  data () {
    window.api.receive('decryptedLedger', (ledger) => {
      if (typeof ledger === 'string') {
        if (ledger === 'found')
          this.ledgerFound = true
      }
      else if (typeof ledger === 'object') {
        this.keys = ledger.keys
        this.ledgerDecrypted = true

        if (this.wantSync) {
          this.wantSync = false
          this.syncLedger()
        }
        else {
          this.loading = false

          if (this.checkLedgerDiff && JSON.stringify(toRaw(this.receipts)) != JSON.stringify(ledger.receipts)) {
            this.loading = true
            this.checkLedgerDiff = false
            setTimeout(() => {this.loading = false}, 400)
          }

          this.receipts = ledger.receipts
        }
      }
      else {
        this.badPassword = true
      }
    })
    // send null to check if the ledger exists
    window.api.send('decryptLedger', null)
    let autoSync = setInterval(() => {
      if (this.loading === false && this.ledgerDecrypted === true && this.wantSync === false) {
        this.checkLedgerDiff = true
        this.syncLedger()
      }
    }, 1000 * 10)
    return {
      keys: [],
      receipts: {},
      ledgerFound: false,
      ledgerDecrypted: false,
      badPassword: false,
      loading: false,
      wantSync: false,
      autoSync,
      checkLedgerDiff: false,
      page: 'ledger',
    }
  },
  methods: {
    decryptLedger(password) {
      this.loading = true
      this.wantSync = true
      window.api.send('decryptLedger', password)
    },
    syncLedger() {
      window.api.send('syncLedger', toRaw(this.keys))
    },
    changePage(page) {
      this.page = page
    },
    generateKey(name) {
      this.loading = true
      this.page = 'ledger'
      window.api.send('generateKey', {name, keys: toRaw(this.keys), receipts: toRaw(this.receipts)})
    },
    transfer(data) {
      this.loading = true
      this.page = 'ledger'
      window.api.send('transfer', {recipientKey: data.recipientKey, installments: data.installments, keys: toRaw(this.keys), receipts: toRaw(this.receipts)})
    },
    consolidate(key) {
      this.loading = true
      window.api.send('consolidate', {key, keys: toRaw(this.keys)})
    },
    redeem(data) {
      this.loading = true
      window.api.send('redeem', {key: data.key, receipt: data.receipt, keys: toRaw(this.keys)})
    },
  },
  computed: {
    denariiTotal() {
      let total = 0

      for (let index in this.receipts) {
        if (this.receipts[index].redeemed !== true)
          total += this.receipts[index].installments
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
