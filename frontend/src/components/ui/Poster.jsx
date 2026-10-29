import { useState } from "react";
import Icon from "./Icon";
export default function Poster({ src, title, className = "", loading = "lazy", ...props }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) {
    return <div className={`poster-placeholder ${className}`} role="img" aria-label={`Póster no disponible: ${title}`}><Icon name="film" size={32}/><span>Póster no disponible</span></div>;
  }
  const responsive = /^https:\/\/image\.tmdb\.org\/t\/p\/w500\//.test(src);
  return <img sizes="(max-width: 600px) 45vw, (max-width: 1024px) 25vw, 220px" srcSet={responsive ? [185, 342, 500].map((width) => `${src.replace('/w500/', `/w${width}/`)} ${width}w`).join(', ') : undefined} {...props} className={`poster-image ${className}`} src={src} alt={`Póster de ${title}`} loading={loading} decoding="async" onError={() => setFailedSrc(src)}/>;
}
