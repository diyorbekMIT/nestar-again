import { Module } from '@nestjs/common';
import { AppService } from '../../app.service';
import { MemberResolver } from './member.resolver';
import { MemberService } from './member.service';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';

@Module({
    imports: [MongooseModule.forFeature([{name: "Member", schema: MemberSchema}]),
    ViewModule, 
    AuthModule],
    providers:[MemberResolver, MemberService],
    exports: [MemberService]

})
export class MemberModule {

}
