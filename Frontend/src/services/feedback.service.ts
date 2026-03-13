const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feedback`;

export interface FeedbackPayload {
  rating: number;
  category: string;
  comment: string;
}

export const feedbackService = {
  submit: async (payload: FeedbackPayload): Promise<void> => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Error al enviar el comentario');
    }
  },
};
