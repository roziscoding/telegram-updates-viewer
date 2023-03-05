<script setup lang="ts">
import { ref, computed, watch, onBeforeMount } from 'vue'
import { Bot } from 'grammy/web'
import { Update } from '@grammyjs/types'
import MonacoEditor from 'monaco-editor-vue3'

const token = ref(localStorage.getItem('token') || '')
const state = ref<'idle' | 'initializing' | 'listening' | 'stopping' | 'stopped' | 'error'>('idle')
const error = ref<Error>()
const bot = ref<Bot>()

const updatesMap = new Map<number, Update>()
const updatesList = ref<Array<Update & { type: string }>>([])
const selectedUpdateId = ref<number[]>([ 0 ])
const selectedUpdate = computed(() => JSON.stringify(updatesMap.get(selectedUpdateId.value[ 0 ]), null, 4))

watch(token, (value) => {
  localStorage.setItem('token', value)
})

const toggleListening = () => {
  if (stateIs('listening')) return stopListening()
  return startListening()
}

const startListening = async () => {
  if (stateIs('initializing')) return
  state.value = 'initializing'
  try {
    bot.value = new Bot(token.value)
    bot.value.use(ctx => {
      updatesMap.set(ctx.update.update_id, ctx.update)
      updatesList.value.unshift({
        ...ctx.update,
        type: Object.keys(ctx.update).filter(key => key !== 'update_id')[ 0 ]
      })
      if (!selectedUpdateId.value[ 0 ]) selectedUpdateId.value = [ ctx.update.update_id ]
    })

    await bot.value.api.getMe()
    await bot.value.init()
    await bot.value.start({
      allowed_updates: [
        'message',
        'edited_message',
        'channel_post',
        'edited_channel_post',
        'inline_query',
        'chosen_inline_result',
        'callback_query',
        'shipping_query',
        'pre_checkout_query',
        'poll',
        'poll_answer',
        'my_chat_member',
        'chat_member',
        'chat_join_request'
      ],
      onStart: () => {
        state.value = 'listening'
      }
    })
  } catch (err) {
    state.value = 'error'
    error.value = err as Error
  }
}

const stopListening = async () => {
  if (stateIs('stopping')) return
  state.value = 'stopping'
  await bot.value?.stop()
  state.value = 'stopped'
}

const stateIs = (...states: Array<typeof state[ 'value' ]>) => states.includes(state.value)
const stateLabel = computed(() => {
  switch (state.value) {
    case 'error':
      return 'Error'
    case 'idle':
      return 'Click "start"'
    case 'initializing':
      return 'Initializing'
    case 'listening':
      return 'Listening'
    case 'stopped':
      return 'Not Listening'
    case 'stopping':
      return 'Stopping'
  }
})
</script>

<template>
  <v-layout full-height>
    <v-app-bar color="primary">
      <v-app-bar-title>Telegram Update Visualizer</v-app-bar-title>

      <template #append>
        <v-btn href="https://github.com/roziscoding/telegram-updates-viewer" icon="mdi-github"></v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <v-container fluid class="h-100">
        <v-row>
          <v-expand-x-transition>
            <v-col cols="12" v-if="stateIs('error')">
              <v-alert title="Error" variant="tonal" color="error">
                {{ error?.message || error }}
              </v-alert>
            </v-col>
          </v-expand-x-transition>
        </v-row>
        <v-row align="center">
          <v-col cols="12">
            <v-text-field variant="solo" placeholder="The one @botfather sent you" hide-details
              :readonly="stateIs('initializing', 'listening')" :loading="stateIs('initializing')" v-model="token"
              label="Token">
              <template #append-inner>
                <v-btn block :color="stateIs('listening', 'stopping') ? 'red' : 'green'" @click="toggleListening"
                  :loading="stateIs('initializing', 'stopping')">
                  {{ stateIs('initializing', 'listening') ? 'stop' : 'Start' }}
                </v-btn>
              </template>
            </v-text-field>
          </v-col>
        </v-row>
        <v-row class="grow-height">
          <v-col cols="12">
            <v-card :loading="stateIs('listening')" rounded class="h-100">
              <v-toolbar color="secondary">
                <v-toolbar-title>
                  {{ stateLabel }}{{ stateIs('listening') ? ` (@${bot?.botInfo.username})` : '' }}
                </v-toolbar-title>
              </v-toolbar>
              <v-row class="h-100 ma-0 pa-0">
                <v-col cols="2" class="pa-0">
                  <v-list mandatory v-model:selected="selectedUpdateId" :return-object="false" class="py-0"
                    style="max-height: calc(100vh - 7%);">
                    <v-divider />
                    <v-list-item
                      v-for="                                    update                                     in updatesList"
                      :value="update.update_id">
                      <v-list-item-title>
                        {{ update.type }}
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        {{ update.update_id }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-col>
                <v-col class="pa-0 h-100" cols="10">
                  <monaco-editor v-if="selectedUpdate" class="h-100"
                    :options="{ readOnly: true, wordWrap: 'on', stickyScroll: { enabled: true }, scrollBeyondLastLine: false }"
                    language="json" :value="selectedUpdate" theme="vs-dark" />
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-layout>
</template>

<style>
.v-field__append-inner {
  align-items: center !important;
  padding-top: 0 !important;
}

.shiki {
  border-radius: 10px;
}

.grow-height {
  height: 90%
}
</style>