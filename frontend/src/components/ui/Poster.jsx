import { useState } from "react";
import Icon from "./Icon";
export default function Poster({ src, title, className = "", loading = "lazy", ...props }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) {
    return <div className={`poster-placeholder ${className}`} role="img" aria-label={`Póster no disponible: ${title}`}><Icon name="film" size={32}/><span>Póster no disponible</span></div>;
  }
  return <img {...props} className={`poster-image ${className}`} src={src} alt={`Póster de ${title}`} loading={loading} decoding="async" onError={() => setFailedSrc(src)}/>;
}
