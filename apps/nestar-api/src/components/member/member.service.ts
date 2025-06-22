import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from '../../libs/dto/member/member';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Message } from '../../libs/enums/common.enum';
import { response } from 'express';
import { MemberStatus } from '../../libs/enums/member.enum';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class MemberService {  

    constructor (@InjectModel("Member") private readonly memberModel: Model<Member>, 
     private authService: AuthService
     ){}
    public async signup(input: MemberInput): Promise<Member>
    {
        input.memberPassword = await this.authService.hashPassword(input.memberPassword);
        try {
            return this.memberModel.create(input);
        } catch(err) {
            console.log("error, Service model  ", err.message);
            throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
        }
    }
    public async login(input: LoginInput): Promise<Member> {
        const { memberNick, memberPassword } = input;
      
        const response: Member = await this.memberModel
          .findOne({ memberNick: memberNick })
          .select('+memberPassword')
          .exec();
      
        if (!response || response.memberStatus === MemberStatus.DELETE) {
          throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
        } else if (response.memberStatus === MemberStatus.BLOCK) {
          throw new InternalServerErrorException(Message.BLOCKED_USER);
        }
      
        // ⚠️ Make sure the correct argument order is used: (plain, hashed)
        const isMatch = await this.authService.comparePasswords(memberPassword, response.memberPassword);
        if (!isMatch) {
          throw new InternalServerErrorException(Message.WRONG_PASSWORD);
        }
      
        // 🔐 Security: remove password before returning user data
        response.memberPassword = undefined;
      
        return response;
      }
      

    public async updateMember(): Promise<string> {
        return "lgoic executed"
    }

    public async getMember(): Promise<string> {
        return "lgoic executed"
    }
    
}
