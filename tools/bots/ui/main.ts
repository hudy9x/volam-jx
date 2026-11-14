import { startBotPanel } from './BotPanel';
import { setManifest } from './assets';
import './page.css';
async function start(): Promise<void> {
  try { const response = await fetch('/assets/manifest.json'); if (response.ok) setManifest(await response.json()); } catch { /* preview URLs also work without manifest */ }
  startBotPanel();
}
void start();
