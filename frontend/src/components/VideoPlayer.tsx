interface Props {
  videoId: string;
}

export default function VideoPlayer({ videoId }: Props) {
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg bg-black">
      <iframe
        src={src}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
}
