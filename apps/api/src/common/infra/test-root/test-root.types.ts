import type { DynamicModule, ForwardReference, Type } from '@nestjs/common';

export type Feature = Type | DynamicModule | ForwardReference;
