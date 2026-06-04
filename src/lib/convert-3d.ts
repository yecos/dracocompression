/**
 * Server-side 3D model conversion utility
 * Converts OBJ, PLY, STL, GLTF, GLB files to Draco-compressed GLB
 */

import { NextRequest } from 'next/server';

export interface ConversionOptions {
  positionQuantization: number;
  normalQuantization: number;
  texCoordQuantization: number;
  colorQuantization: number;
  compressionLevel: number;
  outputFormat: 'glb' | 'gltf';
}

export const DEFAULT_OPTIONS: ConversionOptions = {
  positionQuantization: 11,
  normalQuantization: 8,
  texCoordQuantization: 10,
  colorQuantization: 8,
  compressionLevel: 7,
  outputFormat: 'glb',
};

export const SUPPORTED_INPUT_FORMATS = [
  '.obj', '.ply', '.stl', '.gltf', '.glb', '.dae', '.fbx'
] as const;

export type SupportedFormat = typeof SUPPORTED_INPUT_FORMATS[number];

export function getSupportedFormat(filename: string): SupportedFormat | null {
  const lower = filename.toLowerCase();
  for (const fmt of SUPPORTED_INPUT_FORMATS) {
    if (lower.endsWith(fmt)) return fmt;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
