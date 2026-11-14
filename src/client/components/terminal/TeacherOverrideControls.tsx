import React from 'react';
import { MovementDTO } from '@shared/dtos';

export interface TeacherOverrideControlsProps {
  sessionId: string;
  classCode: string;
  token: string;
  onMovementStarted: (movement: MovementDTO) => void;
}

export function TeacherOverrideControls(_props: TeacherOverrideControlsProps) {
  // Modular extension point for Ticket #7 (Emergency Override & Guest Student Exit)
  return null;
}
