import { Args, Mutation, Resolver, Query} from '@nestjs/graphql';
import { BoardArticleService } from './board-article.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UseGuards } from '@nestjs/common';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import { AllBoardArticlesInquiry, BoardArticleInput, BoardArticlesInquiry } from '../../libs/dto/board-article/board-article.input';
import { ObjectId, } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class BoardArticleResolver {
    constructor (private readonly boardArticleService: BoardArticleService) {}

    @UseGuards(AuthGuard)
    @Mutation(() => BoardArticle)
    public async createBoardArticle(
      @Args('input') input: BoardArticleInput,
      @AuthMember('_id') memberId: ObjectId,
    ): Promise<BoardArticle> {
      console.log('Mutation: CreateBoardArticle was called');
      return await this.boardArticleService.createBoardArticle(memberId, input);
    }

    @UseGuards(WithoutGuard)
    @Query((returns) => BoardArticle) // Correctly specify the return type
    public async getBoardArticle(
    @Args('articleId') input: string, // Explicitly specify the argument type
    @AuthMember('_id') memberId: ObjectId // Ensure custom decorators are defined correctly
  ): Promise<BoardArticle> {
    console.log('Query: getBoardArticle');
    const articleId = shapeIntoMongoObjectId(input);
    return this.boardArticleService.getBoardArticle(memberId, articleId);
  } 


  @UseGuards(AuthGuard)
  @Mutation((returns) => BoardArticle)
  public async updateBoardArticle(
    @Args("input") input: BoardArticleUpdate,
    @AuthMember("_id") memberId: ObjectId): Promise<BoardArticle> {
        console.log("Mutatioin Update Article");
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.boardArticleService.updateBoardArticle(memberId, input);
    }

    @UseGuards(WithoutGuard)
    @Query((returns) => BoardArticles)
    public async getBoardArticles(
      @Args("input") input: BoardArticlesInquiry,
      @AuthMember("_id") memberId: ObjectId
    ): Promise<BoardArticles> {
      console.log("Query: getBoardArticles");
      return await this.boardArticleService.getBoardArticles(memberId, input);
    }  


      /** ADMIN */

      @Roles(MemberType.ADMIN)
      @UseGuards(RolesGuard)
      @Query((returns) => BoardArticles)
      public async getAllBoardArticlesByAdmin(
          @Args("input") input: AllBoardArticlesInquiry,
          @AuthMember("_id") memberId: ObjectId,
      ): Promise<BoardArticles> {
          console.log("Query: getAllBoardArticlesByAdmin");
          return await this.boardArticleService.getAllBoardArticlesByAdmin(input);
      }


      @Roles(MemberType.ADMIN)
      @UseGuards(RolesGuard)
      @Mutation((returns) => BoardArticle)
          public async updateBoardArticleByAdmin(@Args("input")
          input: BoardArticleUpdate): Promise<BoardArticle> {
          console.log("Mutation: updateBoardArticleByAdmin");
          input._id = shapeIntoMongoObjectId(input._id);
          return await this.boardArticleService.updateBoardArticleByAdmin(input);
      }

      @Roles(MemberType.ADMIN)
      @UseGuards(RolesGuard)
      @Mutation((returns) => BoardArticle)
      public async removeBoardArticleByAdmin(
          @Args("articleId") input: string
      ): Promise<BoardArticle> {
          console.log("Mutation: removeBoardArticleByAdmin");
          const articleId = shapeIntoMongoObjectId(input);
          return await this.boardArticleService.removeBoardArticleByAdmin(articleId);
      }
  
  
}
