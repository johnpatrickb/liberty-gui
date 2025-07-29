<script setup>
import {isProxy, toRaw} from 'vue';
</script>

<script>
export default {
  props: ['keys', 'receipts'],
  emits: ['consolidate', 'redeem'],
  data() {
    return {
      selectedIndex: -1,
      showCoupons: false,
      MAX_INSTALLMENTS: 5000,
    }
  },
  methods: {
    select(index) {
      if (this.selectedIndex === index)
        this.selectedIndex = -1
      else
        this.selectedIndex = index
    },
    getInstallments(key) {
      let installments = 0
      for (let receipt of key.receipts) {
        if (receipt.redeemed !== true)
          installments += receipt.installments
      }
      return installments
    },
    getCoupons(key) {
      let coupons = 0
      for (let receipt of key.receipts) {
        if (receipt.redeemed === true)
          coupons++
      }
      return coupons
    },
    canConsolidate(key) {
      let unfinished = 0

      for (let receipt of key.receipts) {
        if (receipt.installments !== this.MAX_INSTALLMENTS)
          unfinished++
      }

      if (unfinished > 1)
        return true

      return false
    },
    canRedeem(receipt) {
      return receipt.installments === this.MAX_INSTALLMENTS && receipt.redeemed !== true
    },
    consolidate(key) {
      if (this.canConsolidate(key))
        this.$emit('consolidate', toRaw(key))
    },
    redeem(key, receipt) {
      if (this.canRedeem(receipt))
        this.$emit('redeem', {key: toRaw(key), receipt: toRaw(receipt)})
    },
    toggleCoupons() {
      this.showCoupons = !this.showCoupons
    },
    showReceipt(receipt) {
      return (receipt.redeemed === true && this.showCoupons === true) || (receipt.redeemed !== true && this.showCoupons === false)
    },
  },
  computed: {
    joinedKeys() {
      let joinedKeys = []
      for (let key of this.keys) {
        let joinedKey = key
        joinedKey.receipts = []
        for (let receipt of this.receipts) {
          if (receipt.ownerPubkey === key.pubkey) {
            joinedKey.receipts.push(receipt)
          }
        }
        joinedKeys.push(joinedKey)
      }
      return joinedKeys
    }
  }
}
</script>

<template>
  <div>
    <div>
      <button @click="toggleCoupons()">{{showCoupons ? 'Show Denarii' : 'Show Coupons'}}</button>
    </div>
    <div v-for="(key, index) in joinedKeys" class="key-container">
      <p class="keyname" @click="select(index)" >
        <span v-if="key.name">{{key.name}}</span>
        <span v-else>Unnamed Key</span>
        : 
        <span v-if="!showCoupons">{{getInstallments(key)}} {{getInstallments(key) === 1 ? 'Denarius' : 'Denarii'}}</span>
        <span v-else>{{getCoupons(key)}} {{getCoupons(key) === 1 ? 'Coupon' : 'Coupons'}}</span>
      </p>
      <div v-show="selectedIndex === index">
        <h3>Public Key</h3>
        <p class="pubkey">{{key.pubkey}}</p>
        <h3><span v-if="showCoupons">Redeemed </span>Receipts <button v-show="!showCoupons" v-if="canConsolidate(key)" @click="consolidate(key)">Consolidate</button></h3>
        <div v-for="receipt in key.receipts" class="receipt">
          <p v-show="showReceipt(receipt)">
            ID: {{receipt.id}}, 
            <span v-if="receipt.redeemed !== true">{{receipt.installments}} {{receipt.installments === 1 ? 'Denarius' : 'Denarii'}}</span>
            <span v-else>Coupon Code: {{receipt.coupon}}</span>
            <button v-if="canRedeem(receipt)" @click="redeem(key, receipt)"> Redeem</button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.key-container {
  border-bottom-style: solid;
  border-width: 1px;
}

.key-container p {
  margin: 5px;
  padding: 0;
}

.receipt {
  margin: 0 0 0 20px;
}

.pubkey {
  white-space: pre;
}
</style>
