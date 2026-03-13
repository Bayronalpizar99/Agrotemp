import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import type { FeedbackPayload } from './feedback.service';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Guardar comentario de usuario' })
  @ApiBody({
    schema: {
      example: { rating: 5, category: 'Sugerencia', comment: 'Excelente plataforma.' },
    },
  })
  async create(@Body() body: FeedbackPayload) {
    if (!body.comment || body.rating == null) {
      throw new BadRequestException('El comentario y la calificación son requeridos.');
    }
    const result = await this.feedbackService.saveFeedback(body);
    return { success: true, id: result.id };
  }
}
