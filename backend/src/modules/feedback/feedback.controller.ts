import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

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
  async create(@Body() body: CreateFeedbackDto) {
    const result = await this.feedbackService.saveFeedback(body);
    return { success: true, id: result.id };
  }
}
