import {
  IsString,
  IsNumber,
  IsEmail,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CustomerDto {
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsNumber()
  @Min(18)
  @Max(120)
  age: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ProductDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsBoolean()
  simulateError: boolean;
}

export class CardRequestDto {
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ValidateNested()
  @Type(() => ProductDto)
  product: ProductDto;
}
