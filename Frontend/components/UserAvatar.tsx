// Profile photo (Google/Facebook) or gradient initials, coloured by the first letter of the name
const AVATAR_GRADIENTS = [
  'from-rose-400 to-pink-600',
  'from-violet-400 to-purple-600',
  'from-blue-400 to-indigo-600',
  'from-teal-400 to-emerald-600',
  'from-amber-400 to-orange-500',
  'from-fuchsia-400 to-rose-500',
  'from-sky-400 to-blue-600',
  'from-green-400 to-teal-600',
];

export default function UserAvatar({ name, picture, size = 'sm' }: { name: string; picture?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const gradient = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  const sz = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs';

  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${sz} rounded-full object-cover shrink-0 shadow-sm ring-2 ring-white/30`}
      />
    );
  }

  return (
    <div className={`${sz} bg-linear-to-br ${gradient} rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm select-none leading-none`}>
      {initials}
    </div>
  );
}
