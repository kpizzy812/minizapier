import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ExecutionEventsService } from './execution-events.service';
import { ExecutionsService } from './executions.service';
import { EXECUTION_EVENTS } from './dto/execution-events.dto';

/**
 * WebSocket Gateway for real-time execution updates.
 *
 * Clients can join execution rooms to receive live updates
 * about workflow execution progress.
 */
@WebSocketGateway({
  cors: {
    origin: '*', // In production, configure specific origins
    credentials: true,
  },
  namespace: '/executions',
})
export class ExecutionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ExecutionGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly executionEventsService: ExecutionEventsService,
    private readonly executionsService: ExecutionsService,
  ) {}

  /**
   * Called after gateway is initialized
   */
  afterInit(server: Server): void {
    this.executionEventsService.setServer(server);
    this.logger.log('Execution WebSocket Gateway initialized');
  }

  /**
   * Called when a client connects
   */
  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  /**
   * Called when a client disconnects
   */
  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Handle client joining an execution room.
   * Sends current step statuses to handle race condition where
   * steps complete before client connects.
   */
  @SubscribeMessage(EXECUTION_EVENTS.JOIN_EXECUTION)
  async handleJoinExecution(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ success: boolean; room: string }> {
    const room = `execution:${data.executionId}`;
    client.join(room);

    this.logger.debug(`Client ${client.id} joined room ${room}`);

    // Send current step statuses to handle race condition
    try {
      const stepLogs = await this.executionsService.getStepLogsInternal(
        data.executionId,
      );

      // Send step:complete events for already completed steps
      for (const step of stepLogs) {
        if (step.status === 'success' || step.status === 'error' || step.status === 'skipped') {
          client.emit(EXECUTION_EVENTS.STEP_COMPLETE, {
            executionId: data.executionId,
            nodeId: step.nodeId,
            nodeName: step.nodeName,
            status: step.status,
            output: step.output,
            error: step.error,
            duration: step.duration,
          });
        } else if (step.status === 'running') {
          // Step is still running
          client.emit(EXECUTION_EVENTS.STEP_START, {
            executionId: data.executionId,
            nodeId: step.nodeId,
            nodeName: step.nodeName,
          });
        }
      }

      this.logger.debug(
        `Sent ${stepLogs.length} existing step statuses to client ${client.id}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to get step logs for execution ${data.executionId}: ${error}`,
      );
    }

    return { success: true, room };
  }

  /**
   * Handle client leaving an execution room
   */
  @SubscribeMessage(EXECUTION_EVENTS.LEAVE_EXECUTION)
  handleLeaveExecution(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ): { success: boolean; room: string } {
    const room = `execution:${data.executionId}`;
    client.leave(room);

    this.logger.debug(
      `Client ${client.id} left room ${room}`,
    );

    return { success: true, room };
  }
}
