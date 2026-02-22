import { createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import App from "./App.vue";
import Home from "./views/Home.vue";
import "./styles/app.css";


const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {
            path: "/",
            component: Home
        }
    ]
});

createApp(App).use(router).mount("#app");
