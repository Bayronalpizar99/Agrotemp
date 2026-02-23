import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  public readonly db: admin.firestore.Firestore;

  constructor() {
    // Esto asume que admin ya fue inicializado en firebase.module.ts
    // como lo vi en tu código
    this.db = admin.firestore();
  }
}