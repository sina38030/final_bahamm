import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

function getExtensionFromNameOrType(file: File): string {
  const name = (file as any).name as string | undefined;
  if (name && name.includes('.')) {
    const idx = name.lastIndexOf('.');
    return name.slice(idx + 1).toLowerCase();
  }
  const type = file.type || '';
  const guessed = type.split('/')[1] || 'bin';
  return guessed.toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Collect any File entries under common keys
    const uploadedFiles: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && (key === 'file' || key === 'files' || key === 'image' || key === 'images')) {
        uploadedFiles.push(value);
      }
    }

    if (uploadedFiles.length === 0) {
      // Also support clients that call append('file', ...) multiple times
      const allFiles = formData.getAll('file').filter(v => v instanceof File) as File[];
      if (allFiles.length) uploadedFiles.push(...allFiles);
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ]);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const saved: { name: string; url: string; size: number; type: string }[] = [];

    for (const file of uploadedFiles) {
      if (!allowedTypes.has(file.type)) {
        return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 415 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const ext = getExtensionFromNameOrType(file);
      const baseName = ((file as any).name as string | undefined)?.replace(/\.[^/.]+$/, '') || 'upload';
      const uniqueName = `${baseName}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
      const filePath = path.join(uploadDir, uniqueName);
      await fs.writeFile(filePath, buffer);

      const url = `${req.nextUrl.origin}/uploads/${uniqueName}`;
      saved.push({ name: uniqueName, url, size: buffer.length, type: file.type });
    }

    return NextResponse.json({ files: saved });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}


