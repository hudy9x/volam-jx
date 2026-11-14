declare const __GAME_SERVER_URL__: string;
export const SERVER_URL = new URLSearchParams(location.search).get('server') ?? __GAME_SERVER_URL__;
