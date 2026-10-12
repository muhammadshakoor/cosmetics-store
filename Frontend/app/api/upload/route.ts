import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const hasCloudinary = cloudName && cloudName !== 'your_cloud_name' && process.env.CLOUDINARY_UPLOAD_PRESET;

    if (hasCloudinary) {
      try {
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET!);
        uploadData.append('folder', 'lumina-cosmetics');

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: uploadData }
        );

        const data = await response.json();
        if (response.ok && data.secure_url) {
          return NextResponse.json({ url: data.secure_url });
        }
      } catch {
        // Fall back to local file storage
      }
    }

    // Save locally to public/uploads
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || '.jpg';
    const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanBase}_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
