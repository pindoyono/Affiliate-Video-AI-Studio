import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { OpportunityService } from './opportunity.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'product-import' }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, OpportunityService],
  exports: [ProductsService, OpportunityService],
})
export class ProductsModule {}
