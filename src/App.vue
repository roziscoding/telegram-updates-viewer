<script setup lang="ts">
import { Update } from "@grammyjs/types";
import { Bot } from "grammy/web";
import MonacoEditor from "monaco-editor-vue3";
import { computed, ref, watch } from "vue";

type DecoratedUpdate = Update & {
  type: string;
  timestamp: Date;
  hasDownload: boolean;
  url?: string;
  fileName?: string;
};

const token = ref(localStorage.getItem("token") || "");
const state = ref<"idle" | "initializing" | "listening" | "stopping" | "stopped" | "error">("idle");
const error = ref<Error>();
const bot = ref<Bot>();

const updatesMap = new Map<number, DecoratedUpdate>();
const updatesList = ref<Array<DecoratedUpdate>>([]);
const selectedUpdateId = ref<number[]>([0]);
const selectedUpdate = computed(() => updatesMap.get(selectedUpdateId.value[0]));
const undecoratedSelectedUpdate = computed(() =>
  selectedUpdate.value
    ? (({ type, timestamp, hasDownload, url, ...update }: DecoratedUpdate) => update)(selectedUpdate.value)
    : undefined
);

watch(token, (value) => {
  localStorage.setItem("token", value);
});

const toggleListening = () => {
  if (stateIs("listening")) return stopListening();
  return startListening();
};

const startListening = async () => {
  if (stateIs("initializing")) return;
  state.value = "initializing";
  try {
    bot.value = new Bot(token.value);

    bot.value.use(async (ctx) => {
      const hasDownload = ctx.has(":file");
      const url = hasDownload
        ? await ctx.getFile().then((file) => ({
            url: `https://api.telegram.org/file/bot${token.value}/${file.file_path}`,
          }))
        : {};

      const decoratedUpdate = {
        ...ctx.update,
        type: Object.keys(ctx.update).filter((key) => key !== "update_id")[0],
        timestamp: new Date(),
        hasDownload,
        ...url,
      };

      updatesMap.set(ctx.update.update_id, decoratedUpdate);
      updatesList.value.unshift(decoratedUpdate);
      if (!selectedUpdateId.value[0]) selectedUpdateId.value = [ctx.update.update_id];
    });

    await bot.value.api.getMe();
    await bot.value.init();
    await bot.value.start({
      allowed_updates: [
        "message",
        "edited_message",
        "channel_post",
        "edited_channel_post",
        "inline_query",
        "chosen_inline_result",
        "callback_query",
        "shipping_query",
        "pre_checkout_query",
        "poll",
        "poll_answer",
        "my_chat_member",
        "chat_member",
        "chat_join_request",
      ],
      onStart: () => {
        state.value = "listening";
      },
    });
  } catch (err) {
    state.value = "error";
    error.value = err as Error;
  }
};

const stopListening = async () => {
  if (stateIs("stopping")) return;
  state.value = "stopping";
  await bot.value?.stop();
  state.value = "stopped";
};

const stateIs = (...states: Array<(typeof state)["value"]>) => states.includes(state.value);
const stateLabel = computed(() => {
  switch (state.value) {
    case "error":
      return "Error";
    case "initializing":
      return "Initializing";
    case "listening":
      return "Listening";
    case "stopping":
      return "Stopping";
  }

  return "Telegram Update Viewer";
});

const formatDate = (date: Date) =>
  date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
</script>

<template>
  <v-layout full-height>
    <v-app-bar dense color="primary" elevation="0">
      <v-toolbar-title>
        {{ stateLabel }}{{ stateIs("listening") ? ` (@${bot?.botInfo.username})` : "" }}
      </v-toolbar-title>
      <v-text-field
        variant="solo"
        placeholder="The one @botfather sent you"
        hide-details
        :readonly="stateIs('initializing', 'listening')"
        :loading="stateIs('listening')"
        v-model="token"
        label="Token"
      >
        <template #append-inner>
          <v-btn
            block
            :loading="stateIs('initializing', 'stopping')"
            :color="stateIs('listening', 'stopping') ? 'red' : 'green'"
            @click="toggleListening"
          >
            {{ stateIs("initializing", "listening") ? "stop" : "Start" }}
          </v-btn>
        </template>
      </v-text-field>

      <v-spacer></v-spacer>

      <template #append>
        <v-btn href="https://github.com/roziscoding/telegram-updates-viewer" icon="mdi-github"></v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <v-navigation-drawer permanent :model-value="true" temporary>
        <v-list
          mandatory
          v-model:selected="selectedUpdateId"
          :return-object="false"
          class="py-0"
          style="max-height: calc(100vh - 7%)"
        >
          <v-divider />
          <v-list-item v-for="update in updatesList" :value="update.update_id">
            <v-list-item-title>
              {{ update.type }}
            </v-list-item-title>
            <v-list-item-subtitle>{{ update.update_id }} {{ formatDate(update.timestamp) }} </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
      <v-container fluid class="h-100 pa-0 ma-0">
        <a
          v-if="selectedUpdate && selectedUpdate.hasDownload && selectedUpdate.url"
          download
          :href="selectedUpdate.url"
        >
          <v-btn
            color="secondary"
            class="ma-6"
            icon="mdi-download"
            position="fixed"
            location="bottom right"
            style="z-index: 1"
          ></v-btn>
        </a>
        <v-row>
          <v-expand-x-transition>
            <v-col cols="12" v-if="stateIs('error')">
              <v-alert title="Error" variant="tonal" color="error">
                {{ error?.message || error }}
              </v-alert>
            </v-col>
          </v-expand-x-transition>
        </v-row>
        <monaco-editor
          v-if="selectedUpdate"
          class="h-100 mt-6"
          :options="{
            readOnly: true,
            wordWrap: 'on',
            stickyScroll: { enabled: true },
            scrollBeyondLastLine: false,
          }"
          language="json"
          :value="JSON.stringify(undecoratedSelectedUpdate, null, 4)"
          theme="vs-dark"
        />
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
  height: 90%;
}
</style>
