import type { AddressInfo } from 'node:net';
import { createApp } from '@server/main/app';
import type { MovementDTO, WaitingQueueDTO } from '@shared/dtos';
import { AlertLevel, MovementStatus, QueueEntryStatus } from '@shared/enums';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '@shared/events';
import { type Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Server Seam: Socket.io Real-Time Rooms & NotificationSender Coupling', () => {
  let appInstance: Awaited<ReturnType<typeof createApp>>;
  let serverUrl: string;
  const activeClients: ClientSocket[] = [];

  function createTestClient(
    options: { autoConnect?: boolean } = {},
  ): ClientSocket {
    const client = ioClient(serverUrl, {
      transports: ['websocket'],
      autoConnect: options.autoConnect ?? true,
      forceNew: true,
    });
    activeClients.push(client);
    return client;
  }

  async function waitForConnect(client: ClientSocket): Promise<void> {
    if (client.connected) return;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket.io client connection timed out'));
      }, 3000);

      client.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  beforeEach(async () => {
    appInstance = await createApp({}, { enableBackgroundTimer: false });
    await appInstance.app.listen({ port: 0, host: '127.0.0.1' });
    const address = appInstance.app.server.address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect();
      }
    }
    activeClients.length = 0;
    await appInstance.app.close();
  });

  it('attaches SocketIOServer to Fastify app and allows client connection', async () => {
    expect(appInstance.io).toBeDefined();

    const client = createTestClient();
    await waitForConnect(client);

    expect(client.connected).toBe(true);
    expect(client.id).toBeDefined();
  });

  it('manages session room joining and leaving (join_session / leave_session)', async () => {
    const client = createTestClient();
    await waitForConnect(client);

    const sessionId = 'session-test-42';
    const expectedRoom = SOCKET_ROOMS.sessionRoom(sessionId);

    // Join session room via join_session with ack
    const joinRes = await new Promise<Record<string, unknown>>((resolve) => {
      client.emit(SOCKET_EVENTS.JOIN_SESSION, sessionId, resolve);
    });

    expect(joinRes).toEqual({ ok: true, room: expectedRoom });

    // Verify room contains client socket in server adapter
    const clientId = client.id ?? '';
    const serverSocket = appInstance.io.sockets.sockets.get(clientId);
    expect(serverSocket).toBeDefined();
    expect(serverSocket?.rooms.has(expectedRoom)).toBe(true);

    // Leave session room via leave_session with ack
    const leaveRes = await new Promise<Record<string, unknown>>((resolve) => {
      client.emit(SOCKET_EVENTS.LEAVE_SESSION, sessionId, resolve);
    });

    expect(leaveRes).toEqual({ ok: true, room: expectedRoom });
    expect(serverSocket?.rooms.has(expectedRoom)).toBe(false);
  });

  it('manages coordination room joining and leaving (join_coordination / leave_coordination)', async () => {
    const client = createTestClient();
    await waitForConnect(client);

    // Join coordination rooms
    const joinRes = await new Promise<Record<string, unknown>>((resolve) => {
      client.emit(SOCKET_EVENTS.JOIN_COORDINATION, {}, resolve);
    });

    expect(joinRes).toEqual({
      ok: true,
      rooms: [SOCKET_ROOMS.COORDINATION, SOCKET_ROOMS.COORDINATION_ROOM],
    });

    const clientId = client.id ?? '';
    const serverSocket = appInstance.io.sockets.sockets.get(clientId);
    expect(serverSocket?.rooms.has(SOCKET_ROOMS.COORDINATION)).toBe(true);
    expect(serverSocket?.rooms.has(SOCKET_ROOMS.COORDINATION_ROOM)).toBe(true);

    // Leave coordination rooms
    const leaveRes = await new Promise<Record<string, unknown>>((resolve) => {
      client.emit(SOCKET_EVENTS.LEAVE_COORDINATION, {}, resolve);
    });

    expect(leaveRes).toEqual({
      ok: true,
      rooms: [SOCKET_ROOMS.COORDINATION, SOCKET_ROOMS.COORDINATION_ROOM],
    });
    expect(serverSocket?.rooms.has(SOCKET_ROOMS.COORDINATION)).toBe(false);
    expect(serverSocket?.rooms.has(SOCKET_ROOMS.COORDINATION_ROOM)).toBe(false);
  });

  it('supports join:room and leave:room compatible with useSocket hook', async () => {
    const client = createTestClient();
    await waitForConnect(client);

    // Join arbitrary room
    const joinRes = await new Promise<Record<string, unknown>>((resolve) => {
      client.emit(SOCKET_EVENTS.JOIN_ROOM, 'custom-room-xyz', resolve);
    });
    expect(joinRes).toEqual({ ok: true, room: 'custom-room-xyz' });

    const clientId = client.id ?? '';
    const serverSocket = appInstance.io.sockets.sockets.get(clientId);
    expect(serverSocket?.rooms.has('custom-room-xyz')).toBe(true);

    // Join coordination alias via join:room
    await new Promise<Record<string, unknown>>((resolve) => {
      client.emit(SOCKET_EVENTS.JOIN_ROOM, SOCKET_ROOMS.COORDINATION, resolve);
    });
    expect(serverSocket?.rooms.has(SOCKET_ROOMS.COORDINATION)).toBe(true);
    expect(serverSocket?.rooms.has(SOCKET_ROOMS.COORDINATION_ROOM)).toBe(true);

    // Leave custom room
    await new Promise<Record<string, unknown>>((resolve) => {
      client.emit(SOCKET_EVENTS.LEAVE_ROOM, 'custom-room-xyz', resolve);
    });
    expect(serverSocket?.rooms.has('custom-room-xyz')).toBe(false);
  });

  it('broadcasts real-time events through NotificationSender to targeted rooms', async () => {
    // Client A in Session 1
    const clientA = createTestClient();
    await waitForConnect(clientA);
    await new Promise((resolve) =>
      clientA.emit(SOCKET_EVENTS.JOIN_SESSION, 'session-1', resolve),
    );

    // Client B in Coordination
    const clientB = createTestClient();
    await waitForConnect(clientB);
    await new Promise((resolve) =>
      clientB.emit(SOCKET_EVENTS.JOIN_COORDINATION, {}, resolve),
    );

    // Client C in Session 2
    const clientC = createTestClient();
    await waitForConnect(clientC);
    await new Promise((resolve) =>
      clientC.emit(SOCKET_EVENTS.JOIN_SESSION, 'session-2', resolve),
    );

    const sampleMovement: MovementDTO = {
      id: 'mov-100',
      sessionId: 'session-1',
      studentId: 'stud-1',
      studentRa: 'RA1001',
      studentFullName: 'Lucas Silva',
      studentPublicName: 'Lucas S.',
      abbreviatedName: 'Lucas S.',
      classCode: '3A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: new Date().toISOString(),
      allowedLimitMinutes: 10,
      elapsedMinutes: 1,
      isEmergency: false,
      isGuest: false,
    };

    // 1. Notify movement exit / started
    const exitPromises = Promise.all([
      new Promise<MovementDTO>((resolve) =>
        clientA.once(SOCKET_EVENTS.MOVEMENT_EXIT, resolve),
      ),
      new Promise<MovementDTO>((resolve) =>
        clientB.once(SOCKET_EVENTS.MOVEMENT_EXIT, resolve),
      ),
    ]);

    let clientCReceivedExit = false;
    clientC.once(SOCKET_EVENTS.MOVEMENT_EXIT, () => {
      clientCReceivedExit = true;
    });

    await appInstance.container.notificationSender.notifyMovementExit(
      sampleMovement,
    );

    const [eventA, eventB] = await exitPromises;
    expect(eventA.id).toBe('mov-100');
    expect(eventB.id).toBe('mov-100');
    expect(clientCReceivedExit).toBe(false);

    // 2. Notify queue updated (session-1 only)
    const queueData: WaitingQueueDTO[] = [
      {
        id: 'q-1',
        sessionId: 'session-1',
        studentRa: 'RA1002',
        studentFullName: 'Mariana Lima',
        studentPublicName: 'Mariana L.',
        abbreviatedName: 'Mariana L.',
        position: 1,
        requestedAt: new Date().toISOString(),
        status: QueueEntryStatus.WAITING,
      },
    ];

    const queuePromise = new Promise<{
      sessionId: string;
      queue: WaitingQueueDTO[];
    }>((resolve) => {
      clientA.once(SOCKET_EVENTS.QUEUE_UPDATED, resolve);
    });

    let clientCReceivedQueue = false;
    clientC.once(SOCKET_EVENTS.QUEUE_UPDATED, () => {
      clientCReceivedQueue = true;
    });

    await appInstance.container.notificationSender.notifyQueueUpdated(
      'session-1',
      queueData,
    );

    const queueEvent = await queuePromise;
    expect(queueEvent.sessionId).toBe('session-1');
    expect(queueEvent.queue).toHaveLength(1);
    expect(clientCReceivedQueue).toBe(false);

    // 3. Notify overdue movement
    const overdueMovement: MovementDTO = {
      ...sampleMovement,
      status: MovementStatus.OVERDUE,
      alertLevel: AlertLevel.YELLOW,
    };

    const overduePromises = Promise.all([
      new Promise<MovementDTO>((resolve) =>
        clientA.once(SOCKET_EVENTS.MOVEMENT_OVERDUE, resolve),
      ),
      new Promise<MovementDTO>((resolve) =>
        clientB.once(SOCKET_EVENTS.MOVEMENT_OVERDUE, resolve),
      ),
    ]);

    await appInstance.container.notificationSender.notifyMovementOverdue(
      overdueMovement,
    );
    const [overdueA, overdueB] = await overduePromises;
    expect(overdueA.id).toBe('mov-100');
    expect(overdueB.id).toBe('mov-100');

    // 4. Notify in-transit unresolved (coordination only)
    const inTransitPromises = new Promise<MovementDTO>((resolve) => {
      clientB.once(SOCKET_EVENTS.MOVEMENT_IN_TRANSIT_UNRESOLVED, resolve);
    });

    let clientAReceivedInTransit = false;
    clientA.once(SOCKET_EVENTS.MOVEMENT_IN_TRANSIT_UNRESOLVED, () => {
      clientAReceivedInTransit = true;
    });

    await appInstance.container.notificationSender.notifyMovementInTransitUnresolved(
      sampleMovement,
    );
    const inTransitEvent = await inTransitPromises;
    expect(inTransitEvent.id).toBe('mov-100');
    expect(clientAReceivedInTransit).toBe(false);

    // 5. Notify movement return
    const returnPromises = Promise.all([
      new Promise<MovementDTO>((resolve) =>
        clientA.once(SOCKET_EVENTS.MOVEMENT_RETURN, resolve),
      ),
      new Promise<MovementDTO>((resolve) =>
        clientB.once(SOCKET_EVENTS.MOVEMENT_RETURN, resolve),
      ),
    ]);

    await appInstance.container.notificationSender.notifyMovementReturn({
      ...sampleMovement,
      status: MovementStatus.RETURNED_NORMAL,
    });

    const [returnA, returnB] = await returnPromises;
    expect(returnA.id).toBe('mov-100');
    expect(returnB.id).toBe('mov-100');
  });

  it('shuts down SocketIOServer gracefully when app closes', async () => {
    const client = createTestClient();
    await waitForConnect(client);
    expect(client.connected).toBe(true);

    const disconnectPromise = new Promise<void>((resolve) => {
      client.once('disconnect', () => resolve());
    });

    await appInstance.app.close();
    await disconnectPromise;
    expect(client.connected).toBe(false);
  });
});
