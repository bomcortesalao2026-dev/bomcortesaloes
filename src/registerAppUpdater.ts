// Atualização automática do aplicativo no navegador, inclusive Android.
// O Vite gera nomes com hash para os assets; aqui garantimos que o HTML e o
// Service Worker também sejam atualizados sem o usuário precisar limpar cache.
export function registerAppUpdater(): void {
  if (!('serviceWorker' in navigator)) return;

  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  let reloadedForUpdate = false;
  const hadControllerBeforeRegistration = Boolean(navigator.serviceWorker.controller);

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(swUrl);

      // Verifica uma versão nova ao abrir o aplicativo.
      await registration.update();

      // E também quando o usuário volta para o aplicativo depois de deixá-lo
      // em segundo plano no Android/Chrome.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Na primeira instalação não precisamos recarregar duas vezes.
        if (!hadControllerBeforeRegistration || reloadedForUpdate) return;
        reloadedForUpdate = true;
        window.location.reload();
      });
    } catch (error) {
      console.warn('[Updater] Não foi possível registrar atualização automática:', error);
    }
  });
}
