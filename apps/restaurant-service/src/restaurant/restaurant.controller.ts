import {
  Controller, Get, Post, Patch, Put,
  Body, Param, Query, Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { DayHoursDto } from './dto/create-restaurant.dto';

interface AuthRequest extends Request {
  headers: Request['headers'] & {
    'x-user-id': string;
    'x-user-role': string;
  };
}

@Controller('restaurants')
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateRestaurantDto) {
    const role = req.headers['x-user-role'];
    if (role !== 'restaurant_owner' && role !== 'admin') {
      throw new ForbiddenException('Only restaurant owners can create restaurants');
    }
    return this.restaurantService.create(req.headers['x-user-id'], dto);
  }

  @Get()
  findAll() {
    return this.restaurantService.findAll();
  }

  @Get('nearby')
  findNearby(@Query() query: NearbyQueryDto) {
    return this.restaurantService.findNearby(query);
  }

  @Get('my')
  findMine(@Req() req: AuthRequest) {
    return this.restaurantService.findByOwner(req.headers['x-user-id']);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantService.findById(id);
  }

  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantService.update(id, req.headers['x-user-id'], dto);
  }

  @Patch(':id/toggle')
  toggle(@Req() req: AuthRequest, @Param('id') id: string) {
    const role = req.headers['x-user-role'];
    if (role !== 'restaurant_owner' && role !== 'admin') {
      throw new ForbiddenException('Only restaurant owners can toggle status');
    }
    return this.restaurantService.toggle(id, req.headers['x-user-id']);
  }

  @Put(':id/hours')
  setHours(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: { hours: DayHoursDto[] }) {
    const role = req.headers['x-user-role'];
    if (role !== 'restaurant_owner' && role !== 'admin') {
      throw new ForbiddenException('Only restaurant owners can set opening hours');
    }
    return this.restaurantService.setOpeningHours(id, req.headers['x-user-id'], body.hours);
  }
}
