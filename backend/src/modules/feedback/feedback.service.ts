import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject('FIRESTORE') private readonly firestore: Firestore,
  ) {}

  async saveFeedback(payload: CreateFeedbackDto): Promise<{ id: string }> {
    const doc = await this.firestore.collection('feedback').add({
      ...payload,
      createdAt: new Date().toISOString(),
    });
    return { id: doc.id };
  }
}
