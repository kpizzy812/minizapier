import { Module, Global } from '@nestjs/common';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { CryptoService } from './crypto.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Credentials Module - manages encrypted credentials storage
 * Global module so credentials service can be used anywhere
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [CredentialsController],
  providers: [CredentialsService, CryptoService],
  exports: [CredentialsService, CryptoService],
})
export class CredentialsModule {}
