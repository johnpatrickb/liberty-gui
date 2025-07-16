<script setup>
</script>

<script>
export default {
  props: ['denariiTotal', 'activePage'],
  emits: ['change'],
  methods: {
    change(page) {
      if (this.activePage !== page)
        this.$emit('change', page)
    },
  }
}
</script>

<template>
  <div class="sidebar">
    <h2>{{denariiTotal}} Denarii</h2>
    <ul>
      <li @click="change('ledger')">Ledger</li>
      <li @click="change('newKey')">New Key</li>
      <li @click="change('transfer')">Transfer</li>
      <li @click="change('settings')">Settings</li>
    </ul>
  </div>
</template>

<style scoped>
</style>
