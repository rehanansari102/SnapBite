import { IsString, IsOptional, Matches, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(50) firstName?: string;
  @IsOptional() @IsString() @MaxLength(50) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) @Matches(/^\+?[\d\s\-(). ]+$/, { message: 'Invalid phone number' }) phone?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) avatarUrl?: string;
}
