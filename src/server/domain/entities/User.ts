import { UserRole } from '@shared/enums';
import { UserDTO } from '@shared/dtos';
import { PinCode } from '../value-objects/PinCode';

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  pinCode: PinCode | string;
}

export class User {
  public readonly id: string;
  public readonly name: string;
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly role: UserRole;
  private _pinCode: PinCode;

  private constructor(
    id: string,
    name: string,
    email: string,
    passwordHash: string,
    role: UserRole,
    pinCode: PinCode
  ) {
    this.id = id;
    this.name = name;
    this.email = email.trim().toLowerCase();
    this.passwordHash = passwordHash;
    this.role = role;
    this._pinCode = pinCode;
  }

  public static create(props: UserProps): User {
    const pin =
      props.pinCode instanceof PinCode
        ? props.pinCode
        : PinCode.create(props.pinCode);
    return new User(
      props.id,
      props.name,
      props.email,
      props.passwordHash,
      props.role,
      pin
    );
  }

  public get pinCode(): PinCode {
    return this._pinCode;
  }

  public verifyPin(pin: string): boolean {
    return this._pinCode.matches(pin);
  }

  public updatePin(newPin: string | PinCode): void {
    this._pinCode =
      newPin instanceof PinCode ? newPin : PinCode.create(newPin);
  }

  public toDTO(): UserDTO {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
    };
  }
}
