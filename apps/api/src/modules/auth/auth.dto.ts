import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty()
  @IsString()
  companyName!: string;

  @ApiProperty({ enum: Role, required: false, default: Role.ADMIN })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @MinLength(8)
  password!: string;
}

