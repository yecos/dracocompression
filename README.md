# Draco 3D Converter

Conversor de modelos 3D a GLB con compresión Draco. Interfaz web fácil de usar para convertir archivos 3D directamente en tu navegador.

## Formatos soportados

| Formato | Extensión | Entrada | Notas |
|---------|-----------|---------|-------|
| Wavefront OBJ | `.obj` | ✅ | Formato universal de mallas 3D |
| Stanford PLY | `.ply` | ✅ | Nubes de puntos y mallas |
| Stereolithography | `.stl` | ✅ | Impresión 3D |
| glTF | `.gltf` | ✅ | Estándar web 3D (JSON) |
| glTF Binary | `.glb` | ✅ | glTF binario |
| Collada | `.dae` | ✅ | Ideal para exportar desde SketchUp |
| Autodesk FBX | `.fbx` | ✅ | Soporte limitado |
| SketchUp | `.skp` | ⚠️ | Requiere exportar como .dae/.obj primero |

**Formato de salida:** `.glb` (glTF Binary con compresión Draco)

## Instalación

### Requisitos previos
- **Node.js** 18 o superior: https://nodejs.org/
- **npm** o **bun** (viene con Node.js)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/yecos/dracocompression.git
cd dracocompression

# 2. Instalar dependencias
npm install

# 3. Iniciar la aplicación
npm run dev
```

4. Abrir el navegador en **http://localhost:3000**

## Cómo usar

### Convertir archivos 3D

1. Arrastrá tus archivos 3D a la zona de carga (o hacé clic para seleccionar)
2. Ajustá las opciones de compresión en la pestaña "Ajustes" si querés
3. Hacé clic en "Convertir a GLB con Draco"
4. Descargá el archivo .glb resultante

### Convertir archivos SKP (SketchUp)

Los archivos .skp son formato propietario y **no se pueden convertir directamente**. Seguí estos pasos:

1. Abrí tu archivo en SketchUp
2. Exportá como **.dae** (Collada): `File → Export → 3D Model → elegir .dae`
3. Subí el archivo .dae a esta herramienta
4. Se convertirá automáticamente a GLB con Draco

**Alternativa:** Usá Blender (gratis) para abrir .skp y exportar como .glb directamente.

### Opciones de compresión

| Opción | Default | Rango | Descripción |
|--------|---------|-------|-------------|
| Posición | 11 bits | 0-20 | Cuantización de vértices. 11 = buena calidad |
| Normales | 8 bits | 0-16 | Cuantización de normales |
| Coordenadas UV | 10 bits | 0-16 | Cuantización de texturas |
| Color | 8 bits | 0-16 | Cuantización de colores |
| Nivel compresión | 7 | 0-10 | 0=rápido, 10=máximo |

## Uso desde línea de comandos (Node.js)

Si preferís usar Draco desde la terminal:

```javascript
const draco3d = require('draco3d');
const fs = require('fs');

// Codificar
const encoderModule = draco3d.createEncoderModule();
const encoder = new encoderModule.Encoder();
const meshBuilder = new encoderModule.MeshBuilder();
const dracoMesh = new encoderModule.Mesh();

// Agregar geometría...
const vertices = new Float32Array([0,0,0, 1,0,0, 0.5,1,0]);
const indices = new Uint32Array([0, 1, 2]);
meshBuilder.AddFacesToMesh(dracoMesh, 1, indices);
meshBuilder.AddFloatAttributeToMesh(dracoMesh, encoderModule.POSITION, 3, 3, vertices);

encoder.SetAttributeQuantization(encoderModule.POSITION, 11);
const encodedData = new encoderModule.DracoInt8Array();
const encodedLen = encoder.EncodeMeshToDracoBuffer(dracoMesh, encodedData);

// Guardar
const compressedArray = new Int8Array(encodedLen);
for (let i = 0; i < encodedLen; i++) compressedArray[i] = encodedData.GetValue(i);
fs.writeFileSync('output.drc', Buffer.from(compressedArray));
```

## Tecnologías

- **Next.js 16** - Framework web
- **Three.js** - Carga y exportación de modelos 3D
- **Google Draco 1.5.7** - Compresión de geometría 3D
- **TypeScript** - Lenguaje
- **Tailwind CSS + shadcn/ui** - Interfaz

## Licencia

Este proyecto incluye código de Google Draco, licenciado bajo Apache License 2.0.
