import type { RouterConfig } from "@nuxt/schema";

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (import.meta.server) return { left: 0, top: 0 };

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    return new Promise((resolve) => {
      // Keep behavior aligned with the original Vue router timing.
      const waitTime = 1000;

      setTimeout(() => {
        if (to.path === "/authors") {
          resolve({ left: 0, top: 0, behavior: "auto" });
          return;
        }

        if (window.history.state?.forceTop) {
          resolve({ left: 0, top: 0, behavior: "auto" });
          return;
        }

        const customTarget = window.history.state?.scrollTo;
        if (customTarget) {
          const el = document.querySelector(customTarget);
          if (el) {
            el.scrollIntoView({ behavior: "auto", block: "start" });
            resolve(false);
            return;
          }
        }

        if (savedPosition) {
          resolve({ ...savedPosition, behavior: "auto" });
          return;
        }

        if (to.hash) {
          const element = document.querySelector(to.hash);
          if (element) {
            element.scrollIntoView({ behavior: "auto", block: "start" });
            resolve(false);
            return;
          }
          resolve({ top: 0, behavior: "auto" });
          return;
        }

        resolve({ left: 0, top: 0, behavior: "auto" });
      }, waitTime);
    });
  },
};
