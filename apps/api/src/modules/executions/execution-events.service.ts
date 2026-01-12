import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  EXECUTION_EVENTS,
  ExecutionStartEvent,
  StepStartEvent,
  StepCompleteEvent,
  ExecutionCompleteEvent,
  NodeExecutionStatus,
} from './dto/execution-events.dto';

/**
 * Service for emitting execution events via WebSocket.
 * Used by WorkflowProcessor to send real-time updates.
 */
@Injectable()
export class ExecutionEventsService {
  private readonly logger = new Logger(ExecutionEventsService.name);
  private server: Server | null = null;

  /**
   * Set the WebSocket server instance (called by gateway)
   */
  setServer(server: Server): void {
    this.server = server;
    this.logger.log('WebSocket server initialized for execution events');
  }

  /**
   * Get room name for an execution
   */
  private getRoomName(executionId: string): string {
    return `execution:${executionId}`;
  }

  /**
   * Emit execution start event
   */
  emitExecutionStart(data: {
    executionId: string;
    workflowId: string;
    workflowName: string;
  }): void {
    if (!this.server) {
      this.logger.debug('WebSocket server not initialized, skipping event');
      return;
    }

    const event: ExecutionStartEvent = {
      ...data,
      startedAt: new Date().toISOString(),
    };

    this.server
      .to(this.getRoomName(data.executionId))
      .emit(EXECUTION_EVENTS.EXECUTION_START, event);

    this.logger.debug(`Emitted execution:start for ${data.executionId}`);
  }

  /**
   * Emit step start event
   */
  emitStepStart(data: {
    executionId: string;
    nodeId: string;
    nodeName: string;
  }): void {
    if (!this.server) return;

    const event: StepStartEvent = {
      ...data,
      status: 'running',
    };

    this.server
      .to(this.getRoomName(data.executionId))
      .emit(EXECUTION_EVENTS.STEP_START, event);

    this.logger.debug(
      `Emitted step:start for ${data.nodeId} in ${data.executionId}`,
    );
  }

  /**
   * Emit step complete event
   */
  emitStepComplete(data: {
    executionId: string;
    nodeId: string;
    nodeName: string;
    status: NodeExecutionStatus;
    output?: unknown;
    error?: string;
    duration?: number;
    retryAttempts?: number;
  }): void {
    if (!this.server) return;

    const event: StepCompleteEvent = data;

    this.server
      .to(this.getRoomName(data.executionId))
      .emit(EXECUTION_EVENTS.STEP_COMPLETE, event);

    this.logger.debug(
      `Emitted step:complete for ${data.nodeId} (${data.status}) in ${data.executionId}`,
    );
  }

  /**
   * Emit execution complete event
   */
  emitExecutionComplete(data: {
    executionId: string;
    workflowId: string;
    status: 'SUCCESS' | 'FAILED' | 'PAUSED';
    output?: unknown;
    error?: string;
    startedAt: Date;
  }): void {
    if (!this.server) return;

    const finishedAt = new Date();
    const totalDuration = finishedAt.getTime() - data.startedAt.getTime();

    const event: ExecutionCompleteEvent = {
      executionId: data.executionId,
      workflowId: data.workflowId,
      status: data.status,
      output: data.output,
      error: data.error,
      finishedAt: finishedAt.toISOString(),
      totalDuration,
    };

    this.server
      .to(this.getRoomName(data.executionId))
      .emit(EXECUTION_EVENTS.EXECUTION_COMPLETE, event);

    this.logger.debug(
      `Emitted execution:complete for ${data.executionId} (${data.status})`,
    );
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.server !== null;
  }
}
