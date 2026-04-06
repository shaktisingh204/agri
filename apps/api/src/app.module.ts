import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ThrottlerModule } from "@nestjs/throttler";
import { WinstonModule } from "nest-winston";
import { redisStore } from "cache-manager-redis-yet";
import configuration from "./config/configuration";
import { validateEnv } from "./config/validation";
import { winstonOptions } from "./common/logger/winston.config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { GeographyModule } from "./modules/geography/geography.module";
import { CropCalendarsModule } from "./modules/crop-calendars/crop-calendars.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { HealthController } from "./modules/health/health.controller";

@Module({
  imports: [
    WinstonModule.forRoot(winstonOptions),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: configService.get<string>("redisUrl")
        }),
        ttl: 60_000
      })
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120
      }
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      path: "/graphql"
    }),
    PrismaModule,
    AuthModule,
    GeographyModule,
    CropCalendarsModule,
    UploadsModule,
    AnalyticsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}

