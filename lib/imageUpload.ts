export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const imageTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' } as const;

export function validateImageUpload(type: string, size: number, bytes: Uint8Array): string {
  if (!Object.prototype.hasOwnProperty.call(imageTypes, type)) throw new Error('Choose a JPEG, PNG, WebP or GIF image. SVG files are not supported.');
  if (size <= 0 || size > MAX_IMAGE_BYTES || bytes.length !== size) throw new Error('Image must be between 1 byte and 4 MB.');
  const prefix = Buffer.from(bytes.subarray(0, 12));
  const valid = type === 'image/jpeg' ? prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff
    : type === 'image/png' ? prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : type === 'image/gif' ? ['GIF87a', 'GIF89a'].includes(prefix.subarray(0, 6).toString('ascii'))
        : prefix.subarray(0, 4).toString('ascii') === 'RIFF' && prefix.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!valid) throw new Error('The file contents do not match the selected image type.');
  return imageTypes[type as keyof typeof imageTypes];
}
