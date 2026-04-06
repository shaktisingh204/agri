import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { compare, hash } from "bcryptjs";
import { PlanType, Role } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(payload: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (existingUser) {
      throw new ConflictException("A user with this email already exists.");
    }

    const tenantSlug = payload.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const passwordHash = await hash(payload.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          companyName: payload.companyName,
          slug: `${tenantSlug}-${Date.now()}`,
          planType: PlanType.FREE
        }
      });

      return tx.user.create({
        data: {
          tenantId: tenant.id,
          email: payload.email,
          passwordHash,
          fullName: payload.fullName,
          role: payload.role ?? Role.ADMIN
        },
        include: {
          tenant: true
        }
      });
    });

    return this.buildAuthResponse(user);
  }

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { tenant: true }
    });

    if (!user || !(await compare(payload.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    tenantId: string;
    tenant: { companyName: string; planType: PlanType };
  }) {
    const jwtSecret = this.configService.getOrThrow<string>("jwtSecret");
    const jwtExpiresIn = this.configService.getOrThrow<string>("jwtExpiresIn");

    const token = this.jwtService.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email
      },
      {
        secret: jwtSecret,
        expiresIn: jwtExpiresIn as never
      }
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      tenant: {
        id: user.tenantId,
        companyName: user.tenant.companyName,
        planType: user.tenant.planType
      }
    };
  }
}
