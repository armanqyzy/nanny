import Image from 'next/image';

const SIZE_CLASSES = {
  sm: 'h-11 w-11',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
};

export default function BrandLogo({
  size = 'md',
  className = '',
  imageClassName = '',
  priority = false,
}) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <span className={`relative block shrink-0 ${sizeClass} ${className}`.trim()}>
      <Image
        src="/nanny-logo.png"
        alt="Nanny logo"
        fill
        priority={priority}
        sizes="(max-width: 640px) 44px, 56px"
        className={`object-contain ${imageClassName}`.trim()}
      />
    </span>
  );
}
