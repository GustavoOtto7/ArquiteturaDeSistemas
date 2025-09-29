const axios = require('axios');

class AxiosConfig {
  constructor() {
    if (AxiosConfig.instance) {
      return AxiosConfig.instance;
    }

    this.axiosInstance = axios.create({
      timeout: 10000, // 10 segundos de timeout padrão
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptors para logging e tratamento de erro
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`[HTTP REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[HTTP REQUEST ERROR]', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`[HTTP RESPONSE] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[HTTP RESPONSE ERROR]', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );

    AxiosConfig.instance = this;
  }

  getInstance() {
    return this.axiosInstance;
  }
}

module.exports = new AxiosConfig().getInstance();