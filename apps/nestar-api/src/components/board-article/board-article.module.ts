import { Module } from '@nestjs/common';
import { BoardArticleService } from './board-article.service';
import { BoardArticleResolver } from './board-article.resolver';
import { ViewModule } from '../view/view.module';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { MongooseModule } from '@nestjs/mongoose';
import BoardArticleSchema from '../../schemas/BoardArticle.model';

@Module({
    imports: [MongooseModule.forFeature([{ 
        name: 'BoardArticle', 
        schema: BoardArticleSchema }]), 
	AuthModule, 
	ViewModule,
	MemberModule],
  providers: [BoardArticleService, BoardArticleResolver]
})
export class BoardArticleModule {}
