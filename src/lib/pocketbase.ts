import PocketBase from 'pocketbase';

// URL вашего PocketBase сервера. 
// Локально это обычно http://127.0.0.1:8090
// На продакшене это будет ссылка на ваш сервер, например https://my-youtube-clone.pockethost.io
const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(pbUrl);

// Эта функция-помощник для проверки, залогинен ли пользователь
export const getCurrentUser = () => {
  return pb.authStore.model;
};
