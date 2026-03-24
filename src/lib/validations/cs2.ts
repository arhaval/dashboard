/**
 * CS2 Tournament System - Zod Validation Schemas
 */

import { z } from 'zod';
import { CS2_MAPS } from '@/constants';

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Takım adı en az 2 karakter olmalı'),
  tag: z
    .string()
    .min(2, 'Kısa ad en az 2 karakter olmalı')
    .max(5, 'Kısa ad en fazla 5 karakter olmalı')
    .transform((v) => v.toUpperCase()),
  logo_url: z.string().url().optional().or(z.literal('')),
});

export const createPlayerSchema = z.object({
  team_id: z.string().uuid('Geçersiz takım'),
  name: z.string().min(2, 'Oyuncu adı en az 2 karakter olmalı'),
  steam_id: z.string().min(5, 'Geçersiz Steam ID'),
});

export const createMatchSchema = z.object({
  team1_id: z.string().uuid('Takım 1 seçin'),
  team2_id: z.string().uuid('Takım 2 seçin'),
  match_date: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => data.team1_id !== data.team2_id, {
  message: 'Aynı takım iki kez seçilemez',
  path: ['team2_id'],
});

export const uploadMapCsvSchema = z.object({
  map: z.enum(CS2_MAPS, { error: 'Harita seçin' }),
  team1_score: z.number().min(0, 'Geçersiz skor'),
  team2_score: z.number().min(0, 'Geçersiz skor'),
});

// DatHost Integration
export const startDatHostMapSchema = z.object({
  server_id: z.string().uuid('Sunucu seçin'),
  map: z.enum(CS2_MAPS, { error: 'Harita seçin' }),
});

export const finishSeriesSchema = z.object({
  winner_team_id: z.string().uuid('Kazanan takımı seçin'),
});

export const addDatHostServerSchema = z.object({
  dathost_server_id: z.string().min(1, 'DatHost Server ID gerekli'),
  name: z.string().min(1, 'Sunucu adı gerekli'),
});

export const quickStartMatchSchema = z.object({
  server_id: z.string().uuid('Sunucu seçin'),
  team1_id: z.string().uuid('Takım 1 seçin'),
  team2_id: z.string().uuid('Takım 2 seçin'),
  map: z.enum(CS2_MAPS, { error: 'Harita seçin' }),
}).refine((data) => data.team1_id !== data.team2_id, {
  message: 'İki farklı takım seçin',
  path: ['team2_id'],
});

export const startNextMapSchema = z.object({
  map: z.enum(CS2_MAPS, { error: 'Harita seçin' }),
});

export type CreateTeamFormData = z.infer<typeof createTeamSchema>;
export type CreatePlayerFormData = z.infer<typeof createPlayerSchema>;
export type CreateMatchFormData = z.infer<typeof createMatchSchema>;
export type StartDatHostMapFormData = z.infer<typeof startDatHostMapSchema>;
export type FinishSeriesFormData = z.infer<typeof finishSeriesSchema>;
export type AddDatHostServerFormData = z.infer<typeof addDatHostServerSchema>;
