import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from '../../libs/dto/member/member';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Message } from '../../libs/enums/common.enum';
import { MemberStatus } from '../../libs/enums/member.enum';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class MemberService {  
    constructor(
        @InjectModel("Member") private readonly memberModel: Model<Member>, 
        private readonly authService: AuthService
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
    public async updateMember(): Promise<string> {
        return "update logic executed";
    }

    public async getMember(): Promise<string> {
        return "get logic executed";
    }
}
