import { $, mount } from '../kit/dom';
import './screens.css';

const HTML = `
<section id="screen-login" class="screen panel hidden">
  <h1>Võ Lâm Online</h1>
  <p class="sub">Prototype · Phaser + Colyseus</p>
  <form id="login-form">
    <label>Tài khoản <input name="username" autocomplete="username" required minlength="3" maxlength="20" /></label>
    <label>Mật khẩu <input name="password" type="password" autocomplete="current-password" required minlength="4" /></label>
    <div class="row">
      <button type="submit" data-action="login">Đăng nhập</button>
      <button type="submit" data-action="register" class="secondary">Đăng ký</button>
    </div>
    <p class="error" id="login-error"></p>
  </form>
</section>`;

export interface LoginHandlers {
  /** Log in or create the account; throws with the message to show. */
  submit(action: 'login' | 'register', username: string, password: string): Promise<void>;
}

/** Đăng nhập / Đăng ký. */
export class LoginScreen {
  readonly el: HTMLElement;

  constructor(root: HTMLElement, handlers: LoginHandlers) {
    this.el = mount(root, HTML);
    $('login-form').addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const action = (e.submitter as HTMLButtonElement | null)?.dataset.action === 'register' ? 'register' : 'login';
      const data = new FormData(form);
      this.error('');
      try {
        await handlers.submit(action, String(data.get('username')), String(data.get('password')));
      } catch (err) {
        this.error((err as Error).message);
      }
    });
  }

  error(text: string): void {
    $('login-error').textContent = text;
  }
}
