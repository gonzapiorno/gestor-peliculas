from io import BytesIO

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError


def preparar_foto_perfil(contenido: bytes) -> bytes:
    try:
        with Image.open(BytesIO(contenido), formats=("JPEG", "PNG", "WEBP")) as imagen:
            if imagen.width * imagen.height > 25_000_000:
                raise HTTPException(413, "La imagen supera el límite de 25 megapíxeles")

            orientada = ImageOps.exif_transpose(imagen)
            cuadrada = ImageOps.fit(
                orientada,
                (320, 320),
                method=Image.Resampling.LANCZOS,
            )
            rgba = cuadrada.convert("RGBA")
            fondo = Image.new("RGB", rgba.size, "#171b17")
            fondo.paste(rgba, mask=rgba.getchannel("A"))

            salida = BytesIO()
            fondo.save(salida, format="JPEG", quality=82)
            return salida.getvalue()
    except Image.DecompressionBombError:
        raise HTTPException(413, "La imagen supera el límite de resolución") from None
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise HTTPException(415, "Elegí una imagen JPG, PNG o WebP válida") from None