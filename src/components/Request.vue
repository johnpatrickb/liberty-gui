<script setup>
import QrcodeVue from 'qrcode.vue';
</script>

<script>
export default {
  props: ['status', 'received', 'pubkey', 'mobile'],
  emits: ['request'],
  data() {
    return {
      keyName: '',
      installments: null,
      wantInstallments: 0,
    }
  },
  methods: {
    onSubmit() {
      this.wantInstallments = this.installments
      this.$emit('request', {name: this.keyName, installments: this.installments})
    }
  },
  watch: {
    status(newVal, oldVal) {
      if (oldVal === '') {
        this.keyName = ''
        this.installments = null
      }
    },
  },
}
</script>

<template>
  <div class="request-wrapper">
    <p>A new key with the associated memo will be generated for this request. The QR code generated can be scanned on the mobile app to initiate the transfer on mobile. The public key is also available in pem format for non-mobile transfers. The status of the transfer will be shown below. If you leave this page any transfered receipts will still be shown in your ledger but staying on this page will confirm the requested amount was transfered.</p>
    <form v-show="status === ''" @submit.prevent="onSubmit">
      <h1>Enter Key Memo</h1>
      <input v-model="keyName" type="text" required>
      <h1>Denarii</h1>
      <input v-model="installments" class="installments" type="number" min=1 placeholder=1 required></input>
      <button type="submit">Request</button>
    </form>
    <p class="key">{{pubkey}}</p>
    <qrcode-vue v-if="pubkey !== ''" :value="pubkey + ':' + wantInstallments" :size="200"></qrcode-vue>
    <div v-if="status !== ''">
      <h5 v-show="status === 'pending'">Waiting for {{wantInstallments}} Denarii</h5>
      <h5 v-show="status === 'success'" class="success">Transfer Successful, {{received}} {{received === 1 ? 'Denarius' : 'Denarii'}} Received</h5>
      <h5 v-show="status === 'insufficient'" class="error">Transfer Insufficent, Only {{received}} {{received === 1 ? 'Denarius' : 'Denarii'}} Received</h5>
    </div>
  </div>
</template>

<style scoped>
h1 {
  margin-bottom: 5px;
}

input.installments {
  field-sizing: content;
  min-width: 30px;
}

.success {
  color: green;
}

.error {
  color: red;
}

@media only screen and (max-width: 480px) {
  .request-wrapper {
    padding-left: 10px;
  }
}
</style>
