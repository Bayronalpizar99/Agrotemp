import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';

export interface FeedbackPayload {
  rating: number;
  category: string;
  comment: string;
}

@Injectable()
export class FeedbackService {
  constructor(
    @Inject('FIRESTORE') private readonly firestore: Firestore,
  ) {}

  async saveFeedback(payload: FeedbackPayload): Promise<{ id: string }> {
    const doc = await this.firestore.collection('feedback').add({
      ...payload,
      createdAt: new Date().toISOString(),
    });
    return { id: doc.id };
  }
}
