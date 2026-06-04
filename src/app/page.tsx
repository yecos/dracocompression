'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Toaster, toast } from 'sonner';
import {
  Upload,
  Download,
  FileBox,
  Settings2,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Box,
  FileType,
  ArrowRight,
  Trash2,
  Zap,
  FolderOpen,
} from 'lucide-react';

// Types
interface ConversionOptions {
  positionQuantization: number;
  normalQuantization: number;
  texCoordQuantization: number;
  colorQuantization: number;
  compressionLevel: number;
}

interface FileEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  format: string;
  status: 'pending' | 'converting' | 'done' | 'error';
  progress: number;
  resultBlob?: Blob;
  resultName?: string;
  resultSize?: number;
  errorMessage?: string;
  isSkp?: boolean;
}

const DEFAULT_OPTIONS: ConversionOptions = {
  positionQuantization: 11,
  normalQuantization: 8,
  texCoordQuantization: 10,
  colorQuantization: 8,
  compressionLevel: 7,
};

const SUPPORTED_FORMATS = ['.obj', '.ply', '.stl', '.gltf', '.glb', '.dae', '.fbx', '.skp'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileFormat(filename: string): string {
  const lower = filename.toLowerCase();
  const ext = lower.substring(lower.lastIndexOf('.'));
  return ext;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function Home() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [options, setOptions] = useState<ConversionOptions>(DEFAULT_OPTIONS);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('convert');

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map(file => {
      const format = getFileFormat(file.name);
      const isSkp = format === '.skp';
      const isSupported = SUPPORTED_FORMATS.includes(format);

      return {
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        format,
        status: isSkp ? 'error' : (isSupported ? 'pending' : 'error'),
        progress: 0,
        isSkp,
        errorMessage: isSkp
          ? 'Archivo SKP detectado. Exportá desde SketchUp como .dae o .obj primero.'
          : (!isSupported ? `Formato ${format} no soportado` : undefined),
      };
    });

    setFiles(prev => [...prev, ...entries]);

    if (entries.some(e => e.isSkp)) {
      toast.warning('Archivo SKP detectado', {
        description: 'Los archivos .skp deben exportarse primero desde SketchUp como .dae o .obj',
        duration: 6000,
      });
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  // Convert a single file to GLB using Three.js (client-side)
  const convertFile = useCallback(async (entry: FileEntry): Promise<FileEntry> => {
    try {
      // Dynamic imports for Three.js
      const THREE = await import('three');
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js');

      const arrayBuffer = await entry.file.arrayBuffer();
      const text = await entry.file.text();

      let object3d: THREE.Object3D | THREE.BufferGeometry | null = null;
      const format = entry.format.toLowerCase();

      // Load based on format
      if (format === '.obj') {
        const loader = new OBJLoader();
        object3d = loader.parse(text);
      } else if (format === '.ply') {
        const loader = new PLYLoader();
        object3d = loader.parse(arrayBuffer);
      } else if (format === '.stl') {
        const loader = new STLLoader();
        object3d = loader.parse(arrayBuffer);
      } else if (format === '.gltf' || format === '.glb') {
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        loader.setDRACOLoader(dracoLoader);

        const result = await new Promise<THREE.Group>((resolve, reject) => {
          loader.parse(arrayBuffer, '', (gltf) => resolve(gltf.scene), reject);
        });
        object3d = result;
      } else if (format === '.dae') {
        const loader = new ColladaLoader();
        const result = loader.parse(text, '');
        object3d = result.scene;
      }

      if (!object3d) {
        throw new Error('No se pudo cargar el modelo 3D');
      }

      // If it's a BufferGeometry (PLY, STL), wrap it in a Mesh
      let scene: THREE.Object3D;
      if (object3d instanceof THREE.BufferGeometry) {
        const material = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 0.1,
          roughness: 0.6,
        });
        // Check if geometry has normals
        if (!object3d.attributes.normal) {
          object3d.computeVertexNormals();
        }
        const mesh = new THREE.Mesh(object3d, material);
        scene = new THREE.Group();
        scene.add(mesh);
      } else {
        scene = object3d;
      }

      // Ensure materials are MeshStandardMaterial for better GLB export
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material instanceof THREE.MeshBasicMaterial) {
            const oldMat = child.material;
            child.material = new THREE.MeshStandardMaterial({
              color: oldMat.color,
              map: oldMat.map,
            });
            oldMat.dispose();
          }
          // Compute normals if missing
          if (child.geometry && !child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }
        }
      });

      // Export to GLB
      const exporter = new GLTFExporter();
      const glbResult = await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          scene,
          (result) => {
            if (result instanceof ArrayBuffer) {
              resolve(result);
            } else {
              // If it returns JSON, convert to ArrayBuffer
              const jsonStr = JSON.stringify(result);
              const encoder = new TextEncoder();
              resolve(encoder.encode(jsonStr).buffer);
            }
          },
          reject,
          {
            binary: true,
            dracoOptions: {
              compressionLevel: options.compressionLevel,
              quantizePosition: options.positionQuantization,
              quantizeNormal: options.normalQuantization,
              quantizeTexcoord: options.texCoordQuantization,
              quantizeColor: options.colorQuantization,
            },
          }
        );
      });

      const baseName = entry.name.substring(0, entry.name.lastIndexOf('.')) || entry.name;
      const resultName = `${baseName}.glb`;
      const blob = new Blob([glbResult], { type: 'model/gltf-binary' });

      return {
        ...entry,
        status: 'done',
        progress: 100,
        resultBlob: blob,
        resultName,
        resultSize: blob.size,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido en la conversión';
      return {
        ...entry,
        status: 'error',
        progress: 0,
        errorMessage: message,
      };
    }
  }, [options]);

  // Convert all pending files
  const convertAll = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast.info('No hay archivos pendientes para convertir');
      return;
    }

    setIsConverting(true);

    for (const entry of pendingFiles) {
      setFiles(prev => prev.map(f =>
        f.id === entry.id ? { ...f, status: 'converting' as const, progress: 30 } : f
      ));

      const result = await convertFile(entry);

      setFiles(prev => prev.map(f =>
        f.id === entry.id ? result : f
      ));

      if (result.status === 'done') {
        toast.success(`✅ ${entry.name} convertido exitosamente`);
      } else {
        toast.error(`❌ Error al convertir ${entry.name}`);
      }
    }

    setIsConverting(false);
  }, [files, convertFile]);

  // Download a converted file
  const downloadFile = useCallback((entry: FileEntry) => {
    if (!entry.resultBlob || !entry.resultName) return;

    const url = URL.createObjectURL(entry.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.resultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Download all converted files
  const downloadAll = useCallback(() => {
    const doneFiles = files.filter(f => f.status === 'done');
    doneFiles.forEach((entry, index) => {
      setTimeout(() => downloadFile(entry), index * 300);
    });
  }, [files, downloadFile]);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const doneCount = files.filter(f => f.status === 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Draco 3D Converter</h1>
              <p className="text-xs text-muted-foreground">Conversor de modelos 3D a GLB con compresión Draco</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">v1.5.7</Badge>
            <Badge variant="outline" className="text-xs">Draco Compression</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="convert" className="gap-2">
              <Zap className="w-4 h-4" />
              Convertir
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Ajustes
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-2">
              <Info className="w-4 h-4" />
              Ayuda
            </TabsTrigger>
          </TabsList>

          {/* CONVERT TAB */}
          <TabsContent value="convert" className="space-y-4">
            {/* SKP Warning */}
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">Archivos SKP de SketchUp</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Los archivos .skp son formato propietario y no se pueden convertir directamente.
                <strong> Exportá tu modelo desde SketchUp como .dae (Collada) o .obj</strong>, y luego subí ese archivo aquí.
                <br />En SketchUp: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">File → Export → 3D Model → elegir .dae o .obj</code>
              </AlertDescription>
            </Alert>

            {/* Drop Zone */}
            <Card
              className={`border-2 border-dashed transition-all duration-200 cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-muted-foreground/25 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="py-12 flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-emerald-500' : 'bg-muted'
                }`}>
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium">
                    {isDragging ? 'Soltá los archivos aquí' : 'Arrastrá archivos 3D aquí'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    o hacé clic para seleccionar archivos
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {['.obj', '.ply', '.stl', '.gltf', '.glb', '.dae', '.fbx'].map(fmt => (
                    <Badge key={fmt} variant="outline" className="text-xs">{fmt}</Badge>
                  ))}
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">.skp*</Badge>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".obj,.ply,.stl,.gltf,.glb,.dae,.fbx,.skp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
              </CardContent>
            </Card>

            {/* File List */}
            {files.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Archivos ({files.length})</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAll}
                        disabled={isConverting}
                        className="gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpiar
                      </Button>
                      {doneCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadAll}
                          className="gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar todo
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex gap-2 mt-2">
                    {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</Badge>}
                    {doneCount > 0 && <Badge className="bg-emerald-600">{doneCount} convertido{doneCount > 1 ? 's' : ''}</Badge>}
                    {errorCount > 0 && <Badge variant="destructive">{errorCount} error{errorCount > 1 ? 'es' : ''}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {files.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        entry.status === 'error'
                          ? 'bg-destructive/5 border-destructive/20'
                          : entry.status === 'done'
                          ? 'bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800'
                          : entry.status === 'converting'
                          ? 'bg-blue-50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800'
                          : 'bg-muted/30'
                      }`}
                    >
                      {/* File icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        entry.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-900' :
                        entry.status === 'error' ? 'bg-red-100 dark:bg-red-900' :
                        entry.status === 'converting' ? 'bg-blue-100 dark:bg-blue-900' :
                        'bg-muted'
                      }`}>
                        {entry.status === 'converting' ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : entry.status === 'done' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : entry.status === 'error' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <FileBox className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{entry.name}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">{entry.format.toUpperCase()}</Badge>
                          {entry.isSkp && (
                            <Badge variant="outline" className="text-[10px] shrink-0 border-amber-400 text-amber-600">SKP</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{formatSize(entry.size)}</span>
                          {entry.status === 'done' && entry.resultSize && (
                            <>
                              <ArrowRight className="w-3 h-3" />
                              <span className="text-emerald-600 font-medium">{formatSize(entry.resultSize)}</span>
                              <span className="text-emerald-600 font-medium">
                                (-{Math.round((1 - entry.resultSize / entry.size) * 100)}%)
                              </span>
                            </>
                          )}
                        </div>
                        {entry.status === 'converting' && (
                          <Progress value={entry.progress} className="h-1.5 mt-1.5" />
                        )}
                        {entry.status === 'error' && entry.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">{entry.errorMessage}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {entry.status === 'done' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(entry)}
                            className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Descargar</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(entry.id)}
                          disabled={isConverting}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Convert Button */}
            {pendingCount > 0 && (
              <Button
                onClick={convertAll}
                disabled={isConverting}
                className="w-full h-12 text-base gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                size="lg"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Convirtiendo...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Convertir {pendingCount} archivo{pendingCount > 1 ? 's' : ''} a GLB con Draco
                  </>
                )}
              </Button>
            )}
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Configuración de Compresión Draco
                </CardTitle>
                <CardDescription>
                  Ajustá los parámetros de cuantización y compresión. Más cuantización = más compresión pero menor precisión.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Position Quantization */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Cuantización de Posición</label>
                    <Badge variant="outline">{options.positionQuantization} bits</Badge>
                  </div>
                  <Slider
                    value={[options.positionQuantization]}
                    onValueChange={([v]) => setOptions(prev => ({ ...prev, positionQuantization: v }))}
                    min={0}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = sin cuantización, 11 = default (buena calidad), 14+ = alta precisión
                  </p>
                </div>

                {/* Normal Quantization */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Cuantización de Normales</label>
                    <Badge variant="outline">{options.normalQuantization} bits</Badge>
                  </div>
                  <Slider
                    value={[options.normalQuantization]}
                    onValueChange={([v]) => setOptions(prev => ({ ...prev, normalQuantization: v }))}
                    min={0}
                    max={16}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = sin cuantización, 8 = default, 10+ = alta precisión
                  </p>
                </div>

                {/* Tex Coord Quantization */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Cuantización de Coordenadas UV</label>
                    <Badge variant="outline">{options.texCoordQuantization} bits</Badge>
                  </div>
                  <Slider
                    value={[options.texCoordQuantization]}
                    onValueChange={([v]) => setOptions(prev => ({ ...prev, texCoordQuantization: v }))}
                    min={0}
                    max={16}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = sin cuantización, 10 = default
                  </p>
                </div>

                {/* Color Quantization */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Cuantización de Color</label>
                    <Badge variant="outline">{options.colorQuantization} bits</Badge>
                  </div>
                  <Slider
                    value={[options.colorQuantization]}
                    onValueChange={([v]) => setOptions(prev => ({ ...prev, colorQuantization: v }))}
                    min={0}
                    max={16}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = sin cuantización, 8 = default
                  </p>
                </div>

                <Separator />

                {/* Compression Level */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Nivel de Compresión</label>
                    <Badge variant="outline">{options.compressionLevel}</Badge>
                  </div>
                  <Slider
                    value={[options.compressionLevel]}
                    onValueChange={([v]) => setOptions(prev => ({ ...prev, compressionLevel: v }))}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 = Rápido (menos compresión)</span>
                    <span>7 = Default</span>
                    <span>10 = Máximo (más lento)</span>
                  </div>
                </div>

                <Separator />

                {/* Presets */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Presets Rápidos</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOptions({
                        positionQuantization: 8,
                        normalQuantization: 6,
                        texCoordQuantization: 6,
                        colorQuantization: 6,
                        compressionLevel: 10,
                      })}
                    >
                      Máxima compresión
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOptions(DEFAULT_OPTIONS)}
                    >
                      Default
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOptions({
                        positionQuantization: 14,
                        normalQuantization: 10,
                        texCoordQuantization: 12,
                        colorQuantization: 10,
                        compressionLevel: 5,
                      })}
                    >
                      Alta calidad
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOptions({
                        positionQuantization: 0,
                        normalQuantization: 0,
                        texCoordQuantization: 0,
                        colorQuantization: 0,
                        compressionLevel: 0,
                      })}
                    >
                      Sin compresión
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HELP TAB */}
          <TabsContent value="help" className="space-y-4">
            {/* SKP Guide */}
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                  Cómo convertir archivos SKP (SketchUp) a GLB
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold shrink-0">1</div>
                    <div>
                      <p className="font-medium">Abrí tu archivo en SketchUp</p>
                      <p className="text-sm text-muted-foreground">Abrí el modelo .skp que querés convertir en SketchUp (versión Make o Pro)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold shrink-0">2</div>
                    <div>
                      <p className="font-medium">Exportá como Collada (.dae)</p>
                      <p className="text-sm text-muted-foreground">
                        En SketchUp: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">File → Export → 3D Model</code> y seleccioná el formato <strong>.dae</strong> (Collada).
                        Alternativamente podés exportar como <strong>.obj</strong> o <strong>.fbx</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold shrink-0">3</div>
                    <div>
                      <p className="font-medium">Subí el archivo exportado aquí</p>
                      <p className="text-sm text-muted-foreground">Arrastrá el archivo .dae, .obj o .fbx a la zona de carga y se convertirá automáticamente a GLB con compresión Draco</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold shrink-0">4</div>
                    <div>
                      <p className="font-medium">Descargá tu GLB comprimido</p>
                      <p className="text-sm text-muted-foreground">El archivo .glb resultante con compresión Draco estará listo para usar en web, Three.js, Babylon.js, Unity, etc.</p>
                    </div>
                  </div>
                </div>

                <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Alternativa: SketchUp Web</AlertTitle>
                  <AlertDescription className="text-sm">
                    Si usás SketchUp Free (web), podés exportar como .skp y luego usar el conversor online de SketchUp,
                    o instalar la extensión &quot;Export to DAE&quot; desde Extension Warehouse.
                    También podés usar <strong>Blender</strong> (gratis) para abrir .skp y exportar como .glb directamente.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Supported Formats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileType className="w-5 h-5" />
                  Formatos Soportados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { ext: '.obj', name: 'Wavefront OBJ', input: true, desc: 'Formato universal de mallas 3D' },
                    { ext: '.ply', name: 'Stanford PLY', input: true, desc: 'Formato de nubes de puntos y mallas' },
                    { ext: '.stl', name: 'Stereolithography STL', input: true, desc: 'Formato común para impresión 3D' },
                    { ext: '.gltf', name: 'glTF', input: true, desc: 'Formato estándar web 3D (JSON)' },
                    { ext: '.glb', name: 'glTF Binary', input: true, desc: 'glTF en formato binario' },
                    { ext: '.dae', name: 'Collada DAE', input: true, desc: 'Formato de intercambio (ideal desde SketchUp)' },
                    { ext: '.fbx', name: 'Autodesk FBX', input: true, desc: 'Formato de Autodesk (soporte limitado)' },
                    { ext: '.skp', name: 'SketchUp SKP', input: false, desc: 'Requiere exportar como .dae/.obj primero' },
                  ].map(fmt => (
                    <div key={fmt.ext} className={`flex items-start gap-3 p-3 rounded-lg border ${fmt.input ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800'}`}>
                      <Badge variant={fmt.input ? 'default' : 'outline'} className={`text-xs mt-0.5 ${!fmt.input ? 'border-amber-400 text-amber-600' : 'bg-emerald-600'}`}>
                        {fmt.ext}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{fmt.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <Download className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Formato de salida: GLB con Draco</p>
                    <p className="text-xs text-muted-foreground">
                      Todos los archivos se convierten a .glb (glTF Binary) con compresión Draco,
                      optimizado para web y aplicaciones 3D
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How Draco Works */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  ¿Qué es la compresión Draco?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Draco es una biblioteca de Google que comprime geometría 3D (mallas y nubes de puntos)
                  reduciendo significativamente el tamaño de los archivos sin perder calidad visual perceptible.
                </p>
                <p>
                  La compresión funciona mediante <strong>cuantización</strong>: reduce la precisión de las coordenadas
                  y atributos (posiciones, normales, UVs, colores) a un número configurable de bits. Por ejemplo,
                  con 11 bits de cuantización para posiciones, la pérdida visual es prácticamente imperceptible
                  pero el tamaño del archivo se reduce hasta un 90%.
                </p>
                <p>
                  Los archivos GLB con Draco son compatibles con <strong>Three.js</strong>, <strong>Babylon.js</strong>,
                  <strong>Unity</strong>, <strong>Unreal Engine</strong>, <strong>Blender</strong> y cualquier
                  herramienta que soporte glTF con la extensión KHR_draco_mesh_compression.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>Draco 3D Converter — Basado en Google Draco v1.5.7</p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/yecos/dracocompression"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/google/draco"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Draco Project
            </a>
          </div>
        </div>
      </footer>

      <Toaster richColors />
    </div>
  );
}
