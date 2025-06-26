import { Args, Resolver } from "@nestjs/graphql";
import { AppService } from "../../app.service";
import { Query, Mutation } from "@nestjs/graphql";
import { MemberService } from "./member.service";
import { InternalServerErrorException, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from "../../libs/dto/member/member.input";
import { Member, Members } from "../../libs/dto/member/member";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AuthMember } from "../auth/decorators/authMember.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { MemberType } from "../../libs/enums/member.enum";
import { WithoutGuard } from "../auth/guards/without.guard";
import { MemberUpdate } from "../../libs/dto/member/member.update";
import { ObjectId } from "mongoose";
import { shapeIntoMongoObjectId } from "../../libs/config";

@Resolver()
@UsePipes(ValidationPipe)
export class MemberResolver {
    constructor(private readonly memberService: MemberService){}
  
    @Mutation(() => Member)
    public async signup(@Args("input") input: MemberInput): Promise<Member> {
        try {
            console.log("Mutation: signup");
            console.log("input", input);
            return await this.memberService.signup(input)
        } catch(err) {
           console.log("error on signup", err);
           throw new InternalServerErrorException(err)
        }
       
    }

    @Mutation(() => Member)
    public async login(@Args("input") input: LoginInput): Promise<Member> {
        console.log("login: signup");
        return await this.memberService.login(input)
    }x

    @UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async updateMember(
		@Args('input') input: MemberUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Member> {
		console.log('Mutation: updateMember');
		// console.log('authMember:', authMember);
		delete input._id;
		return await this.memberService.updateMember(memberId, input);
	}

    @UseGuards(AuthGuard)
    @Query(() => String)
    public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
        console.log("checkAuth: checkAuth");
        console.log(`memberNick, ${memberNick}`)
        return `hello, ${memberNick}`
    }
    @Roles(MemberType.USER, MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Query(() => String)
    public async checkAuthRoles(@AuthMember() authMember: Member): Promise<string> {
        console.log("checkAuthRoles: checkAuthRolese");
        return `hello, ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id})`
    }

    @UseGuards(WithoutGuard)
	@Query(() => Member)
	public async getMember(@Args('memberId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
		console.log('Query: getMember');
		const targetId = shapeIntoMongoObjectId(input);
		return await this.memberService.getMember(memberId, targetId);
    }

    @UseGuards(WithoutGuard)
	@Query(() => Members)
	public async getAgents(
		@Args('input') input: AgentsInquiry,
		@AuthMember('_id')
		memberId: ObjectId,
	): Promise<Members> {
		console.log('Query: getAgents');
		return await this.memberService.getAgents(memberId, input);
	}


    /**ADMIN */

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Query(()=> Members)
    public async getMembersByAdmin(@Args("input") input: MembersInquiry): Promise<Members> {
        return await this.memberService.getMembersByAdmin(input);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Query(()=> Member)
    public async updateMemberByAdmin(@Args("input")input: MemberUpdate): Promise<Member> {
        return await this.memberService.updateMemberByAdmin(input);
    }

}