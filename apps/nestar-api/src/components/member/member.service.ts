import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Member, Members } from '../../libs/dto/member/member';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { AuthService } from '../auth/auth.service';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { ViewService } from '../view/view.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { ViewGroup } from '../../libs/enums/view.enum';
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';

@Injectable()
export class MemberService {  
    constructor(
        @InjectModel("Member") private readonly memberModel: Model<Member>, 
        private readonly authService: AuthService,
        private readonly viewService: ViewService,
        private readonly likeService: LikeService
    ) {}

    // ✅ SIGNUP
    public async signup(input: MemberInput): Promise<Member> {
        // Hash the password
        input.memberPassword = await this.authService.hashPassword(input.memberPassword);

        try {
            const createdMember = await this.memberModel.create(input);

            // Convert to plain object to allow accessToken assignment
            const plainMember = createdMember.toObject();

            // Add access token
            plainMember.accessToken = await this.authService.createToken(plainMember);
  
            // Remove password before returning
            delete plainMember.memberPassword;
            console.log(plainMember.accessToken)

            return plainMember as Member;
        } catch (err) {
            console.log("Signup error:", err.message);
            throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
        }
    }

    // ✅ LOGIN
    public async login(input: LoginInput): Promise<Member> {
        const { memberNick, memberPassword } = input;
    
        const response: Member = await this.memberModel
          .findOne({ memberNick })
          .select('+memberPassword')
          .exec();
    
        if (!response || response.memberStatus === MemberStatus.DELETE) {
          throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
        }
        if (response.memberStatus === MemberStatus.BLOCK) {
          throw new InternalServerErrorException(Message.BLOCKED_USER);
        }
    
        // NOTE the order: plainText first, then hashed
        const isMatch = await this.authService.comparePasswords(memberPassword, response.memberPassword);
        if (!isMatch) {
          throw new InternalServerErrorException(Message.WRONG_PASSWORD);
        }
    
        // Remove password for security
        response.memberPassword = undefined;
    
        // Convert Mongoose document to plain object so you can add properties
        const plainMember = response;
    
        // Add token here
        plainMember.accessToken = await this.authService.createToken(plainMember);
    
        // Return plain object casted as Member (with accessToken)
        return plainMember as Member;
    }
    

    // Other methods
    public async updateMember(memberId: ObjectId, input: MemberUpdate): Promise<Member> {
		const result: Member = await this.memberModel
			.findOneAndUpdate(
				{
					_id: memberId,
					memberStatus: MemberStatus.ACTIVE,
				},
				input,
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		result.accessToken = await this.authService.createToken(result);
		return result;
	}


    public async getMember(memberId: ObjectId, targetId: ObjectId): Promise<Member>{
        const search: T = {
            _id: targetId,
            memberStatus: {
                $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
            },
        };
        const targetMember = await this.memberModel.findOne(search).lean().exec();
        if(!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        if(memberId) {
            //Record view
            const viewInput  = {
                memberId: memberId, viewRefId: targetId,
                viewGroup: ViewGroup.MEMBER
            }; 
            const newView = await this.viewService.recordView(viewInput);
            if(newView) {
                 //Increase memberView
                await this.memberModel.findByIdAndUpdate(search, {$inc: {memberViews: 1} },
                    {new: true}
                ).exec();
                targetMember.memberViews++
            }


            const likeInput = {
                memberId: memberId,
                likeRefId: targetId,
                likeGroup: LikeGroup.MEMBER,
            };
            targetMember.meLiked = await this.likeService.checkLikeExistence(likeInput);

            
        }
        return targetMember;
    }

    public async getAgents(memberId: ObjectId, input: AgentsInquiry): Promise<Members> {
		const { text } = input.search;
		const match: T = { memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (text) match.memberNick = { $regex: new RegExp(text, 'i') };
		console.log('match:', match);

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit }, 
							{ $limit: input.limit },
						],

						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		console.log('result:', result);
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}


    public async likeTargetMember(memberId: ObjectId, likeRefId: ObjectId): Promise<Member>{
		const target: Member = await this.memberModel.findOne({ _id: likeRefId, memberStatus: MemberStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.MEMBER
		};

		//Like toggle
		const modifier: number = await this.likeService.toggleLike(input);
		const result = await this.memberStatsEditor({_id: likeRefId, targetKey: "memberLikes", modifier: modifier})
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}


    //**ADMIN */

    public async getMembersByAdmin(input: MembersInquiry): Promise<Members> {
        const {memberStatus, memberType, text} = input.search;
		const match: T = {}
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

        if (memberStatus) match.MemberStatus = memberStatus;
        if (memberType) match.MemberType = memberType;
        if (text) match.MemberNick = {$regex: new RegExp(text, 'i')};



		if (text) match.memberNick = { $regex: new RegExp(text, 'i') };
		console.log('match:', match);

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit }, 
							{ $limit: input.limit },
						],

						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		console.log('result:', result);
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}


	public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
		const result: Member = await this.memberModel.findByIdAndUpdate({ _id: input._id }, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}


    public async memberStatsEditor(input: StatisticModifier): Promise<Member> {
		console.log("Executed")
        const { _id, targetKey, modifier } = input;
		return await this.memberModel.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier }, }, { new: true }).exec();
	}


}
