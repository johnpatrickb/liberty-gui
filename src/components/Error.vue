<script setup>
</script>

<script>
export default {
  props: ['errorText'],
  emits: ['clearError'],
  methods: {
    clear() {
      this.$emit('clearError')
    },
  },
}
</script>

<template>
  <div v-show="errorText !== ''" class="modal-background">
    <div class="modal-body">
      <h1>An Error Has Occured</h1>
      <p class="error">{{errorText}}</p>
      <div>
        <button @click="clear">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error {
  color: red;
}

.modal-background, .modal-body {
  z-index: 2;
}
</style>
