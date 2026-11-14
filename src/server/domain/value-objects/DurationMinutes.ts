export class DurationMinutes {
  public readonly durationMinutes: number;
  public readonly plannedMinutes: number;
  public readonly attendedMinutes: number;
  public readonly attendancePercentage: number;

  private constructor(props: {
    durationMinutes: number;
    plannedMinutes: number;
    attendedMinutes: number;
    attendancePercentage: number;
  }) {
    this.durationMinutes = props.durationMinutes;
    this.plannedMinutes = props.plannedMinutes;
    this.attendedMinutes = props.attendedMinutes;
    this.attendancePercentage = props.attendancePercentage;
  }

  public static fromDates(
    startedAt: Date,
    endedAt: Date,
    plannedMinutes = 50
  ): DurationMinutes {
    if (
      !(startedAt instanceof Date) ||
      !(endedAt instanceof Date) ||
      Number.isNaN(startedAt.getTime()) ||
      Number.isNaN(endedAt.getTime())
    ) {
      throw new Error('Datas de início e retorno devem ser válidas.');
    }

    const diffMs = endedAt.getTime() - startedAt.getTime();
    if (diffMs < 0) {
      throw new Error(
        'O horário de retorno não pode ser anterior ao horário de saída.'
      );
    }

    const durationMinutes = Math.round((diffMs / 60000) * 100) / 100;
    return DurationMinutes.create(durationMinutes, plannedMinutes);
  }

  public static create(
    durationMinutes: number,
    plannedMinutes = 50
  ): DurationMinutes {
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
      throw new Error('A duração da ausência não pode ser negativa.');
    }
    if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
      throw new Error(
        'A duração planejada da sessão deve ser maior que zero minutos.'
      );
    }

    const normalizedDuration = Math.round(durationMinutes * 100) / 100;
    const rawAttended = plannedMinutes - normalizedDuration;
    const attendedMinutes = Math.max(0, Math.round(rawAttended * 100) / 100);

    const rawPercentage =
      ((plannedMinutes - normalizedDuration) / plannedMinutes) * 100;
    const attendancePercentage = Math.max(
      0,
      Math.min(100, Math.round(rawPercentage * 100) / 100)
    );

    return new DurationMinutes({
      durationMinutes: normalizedDuration,
      plannedMinutes,
      attendedMinutes,
      attendancePercentage,
    });
  }

  public get value(): number {
    return this.durationMinutes;
  }

  public get outsideMinutes(): number {
    return this.durationMinutes;
  }

  public get plannedSessionDurationMinutes(): number {
    return this.plannedMinutes;
  }
}
