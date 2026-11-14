export class PinCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(rawPin: string): PinCode {
    const normalized = rawPin.trim();
    if (!/^\d{4}$/.test(normalized)) {
      throw new Error('O PIN deve conter exatamente 4 dígitos numéricos.');
    }
    return new PinCode(normalized);
  }

  public get value(): string {
    return this._value;
  }

  public matches(candidate: string): boolean {
    return this._value === candidate.trim();
  }
}
