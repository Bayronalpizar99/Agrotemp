import { Module } from '@nestjs/common';
import { initializeFirebase } from '../../config/firebase.config';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [
    FirebaseService,
    {
      provide: 'FIRESTORE',
      useFactory: () => {
        return initializeFirebase();
      },
    },
  ],
  exports: [FirebaseService, 'FIRESTORE'],
})
export class FirebaseModule {}