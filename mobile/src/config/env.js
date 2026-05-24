// ============================================================
// HAYAT Mobile — Environment Config
// ============================================================
//
// ⚠️  KURULUM:
//
// 1. Terminal'de IP adresini bul:
//    Mac/Linux: ifconfig | grep "inet "
//    Windows:   ipconfig
//
// 2. Aşağıdaki YOUR_IP_HERE yerine kendi IP'ni yaz
//    Örnek: 'http://192.168.1.42:3001/api'
//
// 3. Backend'in çalıştığından emin ol: cd backend && npm run dev
//
// ============================================================

const ENV = {
  development: {
    API_URL: 'http://YOUR_IP_HERE:3001/api',
  },
  production: {
    API_URL: 'https://api.hayat.app/api',
  },
};

const getEnv = () => {
  if (__DEV__) return ENV.development;
  return ENV.production;
};

export default getEnv();
