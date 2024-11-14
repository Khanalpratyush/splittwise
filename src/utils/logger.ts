type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const logger = {
  info: (message: string, data?: any) => {
    console.log('\x1b[36m%s\x1b[0m', '📘 INFO:', message);
    if (data) console.log(data);
  },
  
  warn: (message: string, data?: any) => {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ WARNING:', message);
    if (data) console.log(data);
  },
  
  error: (message: string, error?: any) => {
    console.log('\x1b[31m%s\x1b[0m', '🔴 ERROR:', message);
    if (error) {
      console.error('Error details:', error);
      console.error('Stack trace:', error.stack);
    }
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('\x1b[35m%s\x1b[0m', '🔍 DEBUG:', message);
      if (data) console.log(data);
    }
  },

  auth: (message: string, data?: any) => {
    console.log('\x1b[32m%s\x1b[0m', '🔐 AUTH:', message);
    if (data) console.log(data);
  },

  db: (message: string, data?: any) => {
    console.log('\x1b[34m%s\x1b[0m', '🗄️ DB:', message);
    if (data) console.log(data);
  }
};

export default logger; 