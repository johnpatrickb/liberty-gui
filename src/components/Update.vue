<script setup>
</script>

<script>
export default {
  data() {
    return {
      showUpdate: true
    }
  },
  props: ['newVersion'],
  emits: ['restart'],
  methods: {
    onRestart() {
      this.$emit('restart')
    },
    onLater() {
      this.showUpdate = false
    },
  },
}
</script>

<template>
  <div v-if="showUpdate" class="modal-background">
    <div class="modal-body">
      <h1>Update Downloaded</h1>
      <p>An update to the Liberty Receipt Manager, version {{newVersion}}, has been downloaded and will apply on next launch. Would you like to restart now? (Server may deny outdated software version)</p>
      <button @click="onRestart">Restart</button>
      <button class="space" @click="onLater">Later</button>
    </div>
  </div>
</template>

<style scoped>
.error {
  color: red;
}

.space {
  margin-left: 10px;
}
</style>
