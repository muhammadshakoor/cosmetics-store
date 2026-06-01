import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET!);
    uploadData.append('folder', 'lumina-cosmetics');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: uploadData }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Upload failed');

    return NextResponse.json({ url: data.secure_url });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
