// Mock Prisma types for testing
export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  definition: unknown;
  sampleData: unknown;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export const Prisma = {
  InputJsonValue: {} as unknown,
};

export class PrismaClient {
  workflow = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  $connect = jest.fn();
  $disconnect = jest.fn();
}
