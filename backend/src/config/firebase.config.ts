import * as admin from 'firebase-admin';
import { join } from 'path';

export const initializeFirebase = () => {
  try {
    let serviceAccount;
    
    // En producción (Render), usamos variables de entorno
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // En desarrollo local, usamos el archivo
      serviceAccount = require(join(process.cwd(), 'src/config/credentials/firebase-service-account.json'));
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    return admin.firestore();
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};