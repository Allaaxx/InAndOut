import React from 'react';
import { MovementDTO, WaitingQueueDTO } from '@shared/dtos';

export interface WaitingQueuePanelProps {
  sessionId: string;
  queue: WaitingQueueDTO[];
  token?: string;
  onQueueUpdated?: (queue: WaitingQueueDTO[]) => void;
  onMovementStarted?: (movement: MovementDTO) => void;
}

export function WaitingQueuePanel(_props: WaitingQueuePanelProps) {
  // Modular extension point for Ticket #6 (FIFO Waiting Queue + 2m Confirmation Window)
  return null;
}
