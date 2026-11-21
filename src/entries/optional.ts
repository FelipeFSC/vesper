import '../../js/util.js';

interface Assistant {
  open: (options: unknown) => void | Promise<void>;
}

interface OptionalApp {
  Assist5e?: Assistant;
  U: { toast: (content: string, type?: string, duration?: number) => void };
}

const app = (window as Window & { App?: OptionalApp }).App!;
app.Assist5e = {
  async open(options) {
    const status = document.createElement('div');
    status.className = 'modal-back';
    const message = document.createElement('p');
    message.className = 'modal';
    message.setAttribute('role', 'status');
    message.textContent = 'Carregando o assistente…';
    status.append(message);
    document.body.append(status);
    try {
      await import('../../js/assistente5e.js');
    } catch (error) {
      console.error(error);
      app.U.toast('Não foi possível abrir o assistente. Tente novamente.', 'error', 6000);
      return;
    } finally {
      status.remove();
    }
    return app.Assist5e!.open(options);
  },
};
