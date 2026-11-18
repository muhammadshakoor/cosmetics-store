import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { MAX_IMAGE_BYTES, validateImageUpload } from '@/lib/imageUpload';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    const limited = await rateLimit(request, 'upload', 20, 600);
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ message: 'No image file provided.' }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ message: 'Image must be 4 MB or smaller.' }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    let ext: string;
    try { ext = validateImageUpload(file.type, file.size, buffer); }
    catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Invalid image.' }, { status: 400 }); }

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
          { method: 'POST', body: uploadData, signal: AbortSignal.timeout(15000) }
        );

        const data = await response.json();
        if (response.ok && typeof data.secure_url === 'string' && data.secure_url.startsWith('https://res.cloudinary.com/')) {
          return NextResponse.json({ url: data.secure_url });
        }
      } catch {
        // Fall back to local file storage
      }
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: 'Image storage is unavailable. Configure Cloudinary and try again.' }, { status: 503 });
    }
    // Local development only: production uploads use durable object storage.
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json(
      { message: 'Image upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
