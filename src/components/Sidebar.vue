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
  },
}
</script>

<template>
  <div class="sidebar">
    <h1 class="mobile-header">Liberty Receipt Manager</h1>
    <h1>{{denariiTotal}} Denarii</h1>
    <ul>
      <li @click="change('ledger')"><strong>Ledger</strong></li>
      <li @click="change('newKey')"><strong>New Key</strong></li>
      <li @click="change('transfer')"><strong>Transfer</strong></li>
      <li @click="change('request')"><strong>Request</strong></li>
      <li @click="change('import')"><strong>Import</strong></li>
      <li @click="change('scan')"><strong>Scan</strong></li>
    </ul>
  </div>
</template>

<style scoped>
.mobile-header {
  display: none;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar ul li {
  cursor: pointer;
  padding-top: 8px;
  font-size: 1.2em;
}

@media only screen and (max-width: 480px) {
  .sidebar {
    text-align: center;
  }

  .mobile-header {
    display: block;
    font-size: 1.4em;
  }

  .sidebar ul li {
    cursor: pointer;
    padding-top: 8px;
    font-size: 1.5em;
  }
}
</style>
