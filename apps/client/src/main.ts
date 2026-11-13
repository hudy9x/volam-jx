// Entry of the client (index.html). Look: ui/kit/theme.css first, then each part's own CSS; flow: app/App.ts.
import './ui/kit/theme.css';
import { startApp } from './app/App';

void startApp(document.getElementById('ui')!);
