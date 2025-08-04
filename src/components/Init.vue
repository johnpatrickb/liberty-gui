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
  <div class="modal-background">
    <div class="modal-body">
      <h1>Liberty Receipt Manager</h1>
      <form @submit.prevent="onSubmit">
        <label><span v-if="!ledgerFound">No </span>Ledger Found, Please Enter<span v-if="!ledgerFound"> New Ledger </span> Password</label>
        <br>
        <input v-model="password" type="password" minlength="10" maxlength="64" required></input>
        <button type="submit">{{ledgerFound ? 'Decrypt' : 'Create'}}</button>
        <p v-if="badPassword" class="error">Failed To Decrypt Local Ledger, Please Try Again</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.error {
  color: red;
}
</style>
