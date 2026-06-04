import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const optionsStr = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    const options = optionsStr ? JSON.parse(optionsStr) : {};

    const filename = file.name.toLowerCase();

    // Check for SKP files specifically
    if (filename.endsWith('.skp')) {
      return NextResponse.json({
        error: 'SKP_NO_DIRECT',
        message: 'Los archivos .skp (SketchUp) requieren una conversión previa. Por favor exportá tu modelo desde SketchUp como .dae (Collada), .obj o .fbx, y luego subí ese archivo aquí.',
        hint: 'En SketchUp: File → Export → 3D Model → elegir formato .dae o .obj'
      }, { status: 400 });
    }

    // Validate format
    const supportedFormats = ['.obj', '.ply', '.stl', '.gltf', '.glb', '.dae', '.fbx'];
    const isSupported = supportedFormats.some(fmt => filename.endsWith(fmt));

    if (!isSupported) {
      return NextResponse.json({
        error: 'FORMATO_NO_SOPORTADO',
        message: `Formato no soportado. Formatos aceptados: ${supportedFormats.join(', ')}`,
        hint: 'Para archivos SKP, exportá primero desde SketchUp como .dae o .obj'
      }, { status: 400 });
    }

    // For now, return info about using client-side conversion
    // The actual conversion will happen client-side using Three.js
    const buffer = await file.arrayBuffer();

    return NextResponse.json({
      success: true,
      filename: file.name,
      size: buffer.byteLength,
      options,
      message: 'File received for client-side processing'
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'CONVERSION_ERROR', message },
      { status: 500 }
    );
  }
}
