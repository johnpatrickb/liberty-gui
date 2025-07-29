<script setup>
</script>

<script>
export default {
  props: ['ledgerFound', 'badPassword'],
  emits: ['decrypt'],
  data () {
    return {
      password: '',
    }
  },
  methods: {
    onSubmit() {
      this.$emit('decrypt', this.password)
      this.password = ''
    }
  }
}
</script>

<template>
  <div class="password-modal">
    <div class="password-modal-body">
      <h1>Liberty Receipt Manager</h1>
      <form @submit.prevent="onSubmit">
        <label><span v-if="!ledgerFound">No </span>Ledger Found, Please Enter<span v-if="!ledgerFound"> New Ledger </span> Password</label>
        <br>
        <input v-model="password" type="password" minlength="10" maxlength="64" required></input>
        <button type="submit">Decrypt</button>
        <p v-if="badPassword" class="error">Failed To Decrypt Local Ledger, Please Try Again</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.password-modal {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: grey;
}

.password-modal-body {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
}

.error {
  color: red;
}
</style>
