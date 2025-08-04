<script setup>
</script>

<script>
export default {
  emits: ['back'],
  methods: {
    back() {
      this.$emit('back')
    },
  },
}
</script>

<template>
  <div class="header">
    <h1 @click="back()" class="mobile-back">&#8249;</h1>
    <h1>Liberty Receipt Manager</h1>
  </div>
</template>

<style scoped>
.mobile-back {
  display: none;
}

.header {
  border-bottom-style: solid;
  border-width: 1px;
  padding: 5px 0 0 5px;
}

.header h1 {
  padding-left: 8px;
}

@media only screen and (max-width: 480px) {
  .header h1 {
    font-size: 1.4em;
    text-align: center;
  }

  .mobile-back {
    display: inline-block;
    position: absolute;
    left: 5px;
    top: 5px;
    background-color: grey;
    border-radius: 50%;
    padding: 4px 16px;
    color: white;
  }
}
</style>
