import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

// Конфигурация Appwrite с фолбэками на ваши значения
let APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
if (APPWRITE_ENDPOINT.startsWith('=')) {
  APPWRITE_ENDPOINT = APPWRITE_ENDPOINT.substring(1);
}
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69e4f8980019f8196e7b';

// Инициализация клиента Appwrite
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Экспортируем сервисы для использования в приложении
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const appwriteClient = client;

// Экспортируем ID для генерации уникальных идентификаторов и Query для запросов
export { ID, Query };

// Константы для коллекций (ID базы данных и названия таблиц)
export const appwriteConfig = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || '69e4fb2b003213a395fe',
    videosId: 'videos',
    usersId: 'users',
    channelsId: 'channels',
    commentsId: 'comments'
};
