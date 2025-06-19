import { Query } from "@nestjs/graphql";
import { Resolver } from "@nestjs/graphql";

@Resolver()
export class AppResolver{
    @Query(() => String)
    public sayHello(): string{
        return "GraphQL API Server"
    }
}