import Image from "next/image";

type SafeCoverImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
};

/**
 * Creator Studio covers are absolute Supabase URLs. Use next/image when
 * possible; fall back to a plain img so a remotePatterns mismatch never
 * 500s the whole article page.
 */
export default function SafeCoverImage({
  src,
  alt,
  priority = false,
  sizes,
  className,
}: SafeCoverImageProps) {
  const isRemote = /^https?:\/\//i.test(src);

  if (isRemote) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- intentional fallback for Supabase Storage
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        className={className ? `${className} h-full w-full` : "h-full w-full object-cover"}
        style={{ objectFit: "cover" }}
        fetchPriority={priority ? "high" : undefined}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
