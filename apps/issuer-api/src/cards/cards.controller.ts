import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { IssueCardDto } from './dto/issue-card.dto';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('issue')
  issueCard(@Body() issueCardDto: IssueCardDto) {
    try {
      return this.cardsService.issueCard(issueCardDto);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || 'Error issuing card',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
