<script setup>
</script>

<script>
export default {
  props: ['denariiTotal'],
  emits: ['transfer'],
  data() {
    return {
      recipientKey: '',
      installments: null,
    }
  },
  methods: {
    onSubmit() {
      if (this.installments <= this.denariiTotal) {
        this.$emit('transfer', {recipientKey: this.recipientKey, installments: this.installments})
        this.recipientKey = ''
        this.installments = 0
      }
    }
  }
}
</script>

<template>
  <div class="transfer-wrapper">
    <form @submit.prevent="onSubmit">
      <h1>Recipient Public Key</h1>
      <textarea v-model="recipientKey" required></textarea>
      <h1>Denarii</h1>
      <input v-model="installments" type="number" min=1 :max="denariiTotal" placeholder=1 required></input>
      <button type="submit">Transfer</button>
    </form>
  </div>
</template>

<style scoped>
h1 {
  margin-bottom: 5px;
}

input {
  field-sizing: content;
  min-width: 30px;
}

@media only screen and (max-width: 480px) {
  .transfer-wrapper {
    padding-left: 10px;
  }
}
</style>
