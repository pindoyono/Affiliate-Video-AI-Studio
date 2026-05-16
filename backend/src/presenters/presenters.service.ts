import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePresenterDto, UpdatePresenterDto } from './presenters.dto';

@Injectable()
export class PresentersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePresenterDto, userId: string) {
    return this.prisma.presenter.create({
      data: { ...dto, userId },
    });
  }

  async findAll(userId: string) {
    return this.prisma.presenter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const presenter = await this.prisma.presenter.findFirst({ where: { id, userId } });
    if (!presenter) throw new NotFoundException('Presenter not found');
    return presenter;
  }

  async update(id: string, dto: UpdatePresenterDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.presenter.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.presenter.delete({ where: { id } });
  }
}
