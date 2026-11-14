import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveExitCard } from '@client/components/terminal/ActiveExitCard';
import { AlertLevel, MovementStatus } from '@shared/enums';
import { MovementDTO } from '@shared/dtos';

describe('Frontend Seam: Multiple Concurrent Exits in ActiveExitCard (User Story 10)', () => {
  const normalMovement: MovementDTO = {
    id: 'mov-1',
    sessionId: 'session-1',
    studentId: 'student-1',
    studentRa: '1001',
    studentFullName: 'Lucas Silva',
    studentPublicName: 'Lucas S.',
    abbreviatedName: 'Lucas S.',
    classCode: '1A',
    subject: 'Matemática',
    status: MovementStatus.IN_TRANSIT,
    alertLevel: AlertLevel.GREEN,
    startedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    allowedLimitMinutes: 10,
    isEmergency: false,
    isGuest: false,
  };

  const emergencyMovement: MovementDTO = {
    id: 'mov-2',
    sessionId: 'session-1',
    studentId: 'student-2',
    studentRa: '1002',
    studentFullName: 'João Mendes',
    studentPublicName: 'João M.',
    abbreviatedName: 'João M.',
    classCode: '1A',
    subject: 'Matemática',
    status: MovementStatus.IN_TRANSIT,
    alertLevel: AlertLevel.GREEN,
    startedAt: new Date().toISOString(),
    allowedLimitMinutes: 10,
    isEmergency: true,
    isGuest: false,
  };

  it('renders all concurrent active exits when emergency exit is authorized alongside regular exit', () => {
    render(
      <ActiveExitCard
        activeMovements={[normalMovement, emergencyMovement]}
      />
    );

    // Both student public names must be visible simultaneously
    expect(screen.getByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByText('João M.')).toBeInTheDocument();

    // Verify multiple active student cards are rendered
    const activeCards = screen.getAllByTestId('active-student-outside');
    expect(activeCards).toHaveLength(2);

    // Verify emergency badge is rendered on the emergency movement
    expect(screen.getByText(/Emergência/i)).toBeInTheDocument();
  });
});
