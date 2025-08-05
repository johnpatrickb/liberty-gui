<script setup>
</script>

<script>
export default {
  props: ['scanKey'],
  emits: ['importKey'],
  data() {
    return {
      privkey: '',
      keyName: '',
    }
  },
  methods: {
    onSubmit() {
      this.$emit('importKey', {privkey: this.privkey, name: this.keyName})
      this.privkey = ''
      this.keyName = ''
    }
  },
  watch: {
    scanKey(newVal, oldVal) {
      this.privkey = newVal
    },
  },
}
</script>

<template>
  <div class="transfer-wrapper">
    <form @submit.prevent="onSubmit">
      <h1>Pem Private Key</h1>
      <textarea v-model="privkey" required></textarea>
      <h1>Enter Key Memo</h1>
      <input v-model="keyName" type="text" required>
      <button type="submit">Import</button>
    </form>
  </div>
</template>

<style scoped>
h1 {
  margin-bottom: 5px;
}

@media only screen and (max-width: 480px) {
  .transfer-wrapper {
    padding-left: 10px;
  }
}
</style>
