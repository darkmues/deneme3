// ============================================================
// HAYAT Mobile — Environment Config
// ============================================================
// ⚠️ DEV: Kendi bilgisayarının local IP adresini yaz
//    Terminal'de: ifconfig (Mac) veya ipconfig (Windows)
//    Örnek: 192.168.1.42
//
// ⚠️ PRODUCTION: API domain'ini yaz
// ============================================================

const ENV = {
  development: {
    API_URL: 'http://192.168.1.100:3001/api',  // ← Kendi IP adresini buraya yaz
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
