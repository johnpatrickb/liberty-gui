<script setup>
</script>

<script>
export default {
  emits: ['newKey'],
  data() {
    return {
      keyName: '',
    }
  },
  methods: {
    onSubmit() {
      this.$emit('newKey', this.keyName)
      this.keyName = ''
    }
  }
}
</script>

<template>
  <div>
    <h1>Enter Key Nickname</h1>
    <form @submit.prevent="onSubmit">
      <input v-model="keyName" type="text" required>
      <button type="submit">Generate</button>
    </form>
  </div>
</template>

<style scoped>
</style>
