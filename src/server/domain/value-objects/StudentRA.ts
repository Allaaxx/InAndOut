export class StudentRA {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(rawRa: string): StudentRA {
    const normalized = (rawRa ?? '').trim();
    if (!normalized) {
      throw new Error('O RA do aluno é obrigatório.');
    }
    if (!/^\d+$/.test(normalized)) {
      throw new Error('O RA do aluno deve conter apenas dígitos numéricos.');
    }
    return new StudentRA(normalized);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: StudentRA | string): boolean {
    const otherValue =
      other instanceof StudentRA ? other.value : (other ?? '').trim();
    return this._value === otherValue;
  }

  public toString(): string {
    return this._value;
  }
}
