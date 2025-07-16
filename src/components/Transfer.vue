<script setup>
</script>

<script>
export default {
  props: ['denariiTotal'],
  emits: ['transfer'],
  data() {
    return {
      recipientKey: '',
      installments: 0,
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
  <div>
    <form @submit.prevent="onSubmit">
      <label>Recipient Public Key</label>
      <textarea v-model="recipientKey" required></textarea>
      <label>Denarii</label>
      <input v-model="installments" type="number" min=1 :max="denariiTotal" required></input>
      <button type="submit">Transfer</button>
    </form>
  </div>
</template>

<style scoped>
</style>
