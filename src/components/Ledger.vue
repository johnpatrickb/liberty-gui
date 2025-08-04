<script setup>
import {isProxy, toRaw} from 'vue';
import QrcodeVue from 'qrcode.vue';
</script>

<script>
export default {
  props: ['keys', 'receipts', 'mobile'],
  emits: ['consolidate', 'redeem', 'remove'],
  data() {
    return {
      selectedIndex: -1,
      showCoupons: false,
      MAX_INSTALLMENTS: 5000,
      modalText: '',
      showPrivate: false,
      removePrivkey: '',
    }
  },
  methods: {
    select(index) {
      this.showPrivate = false
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
    removeModel(privkey) {
      this.removePrivkey = privkey
    },
    remove() {
      this.$emit('remove', this.removePrivkey)
      this.removePrivkey = ''
      this.selectedIndex = -1
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
    <div v-for="(key, index) in joinedKeys" class="key-container" v-show="removePrivkey === ''">
      <p class="keyname" @click="select(index)" :class="{selected: selectedIndex === index}">
        <span v-if="key.name">{{key.name}}</span>
        <span v-else>Unnamed Key</span>
        : 
        <span v-if="!showCoupons">{{getInstallments(key)}} {{getInstallments(key) === 1 ? 'Denarius' : 'Denarii'}}</span>
        <span v-else>{{getCoupons(key)}} {{getCoupons(key) === 1 ? 'Coupon' : 'Coupons'}}</span>
      </p>
      <div v-show="selectedIndex === index" class="key-body">
        <div>
          <br>
          <button @click="showPrivate = !showPrivate">{{showPrivate ? 'Show Public Key' : 'Show Private Key'}}</button>
          <button @click="removePrivkey = key.privkey" class="push-right">Remove Key</button>
        </div>

        <div v-if="showPrivate">
          <h3>Private Key</h3>
          <p class="key">{{key.privkey}}</p>
          <br>
          <qrcode-vue :value="key.privkey" :size="200"></qrcode-vue>
        </div>

        <div v-else>
          <h3>Public Key</h3>
          <p class="key">{{key.pubkey}}</p>
          <br>
          <qrcode-vue :value="key.pubkey" :size="200"></qrcode-vue>
        </div>

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

    <div v-show="removePrivkey !== ''" class="modal-background remove-container">
      <div class="modal-body">
        <h3>Key to Remove</h3>
        <p class="key">{{removePrivkey}}</p>
        <qrcode-vue :value="removePrivkey" :size="200"></qrcode-vue>
        <p>After this key is deleted the public portion can still receive Denarii but you will lose access to it. It is recommended that you save this key to an encrypted disk or import it in another ledger.</p>
        <h4>Are You Sure You Want to Remove This Key?</h4>
        <div>
          <button @click="remove()">Remove</button>
          <button @click="removePrivkey = ''" class="push-right">Cancel</button>
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
  margin: 10px 0 0 5px;
  padding: 0;
}

.key-container .keyname {
  cursor: pointer;
  font-size: 1.1em;
}

.key-container .selected {
  font-weight: bold;
}

.receipt {
  margin: 0 0 0 20px;
}

.push-right {
  margin-left: 10px;
}

@media only screen and (max-width: 480px) {
  .key-body {
    margin-left: 8px;
  }

  .remove-container .key {
    text-align: left;
  }

  .remove-container h3 {
    margin-top: 5px;
  }

  .remove-container p {
    margin-top: 5px;
    margin-bottom: 5px;
  }
}
</style>
