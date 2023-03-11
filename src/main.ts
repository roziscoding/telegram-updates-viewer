import "@mdi/font/css/materialdesignicons.css";
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

import "vuetify/styles";
import { createVuetify } from "vuetify";

import colors from "vuetify/lib/util/colors";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

// @ts-ignore
self.MonacoEnvironment = {
  // @ts-ignore
  getWorker(_, label) {
    if (label === "json") {
      return new jsonWorker();
    }

    return new editorWorker();
  },
};

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "dark",
    themes: {
      dark: {
        colors: {
          primary: colors.indigo.base,
          secondary: colors.lightBlue.base,
        },
      },
    },
  },
});

createApp(App).use(vuetify).mount("#app");
