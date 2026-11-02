import os
from django.core.exceptions import ValidationError
from PIL import Image

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_image_file(file):
    """
    Validates uploaded image file:
    1. Enforces max file size (5MB).
    2. Enforces allowed extensions (.jpg, .jpeg, .png, .webp, .gif).
    3. Validates file header and image integrity using Pillow to prevent executable/SVG uploads.
    """
    if not file:
        return file

    # 1. Size validation
    if hasattr(file, "size") and file.size > MAX_IMAGE_FILE_SIZE_BYTES:
        max_mb = MAX_IMAGE_FILE_SIZE_BYTES / (1024 * 1024)
        raise ValidationError(f"File size exceeds maximum allowed limit of {max_mb:.0f} MB.")

    # 2. Extension validation
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}."
        )

    # 3. Header / Content integrity validation via Pillow
    try:
        # Seek to beginning in case pointer was moved
        if hasattr(file, "seek") and callable(file.seek):
            file.seek(0)
        img = Image.open(file)
        img.verify()
        if hasattr(file, "seek") and callable(file.seek):
            file.seek(0)
    except Exception:
        raise ValidationError("The uploaded file is not a valid, non-corrupted image.")

    return file

